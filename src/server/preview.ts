/**
 * Developer-preview server functions.
 *
 * These proxy three SANDBOX-ONLY Board API endpoints and drive persona
 * session switching. Every function is server-verified against sandbox
 * capability — a client can never coax them into acting on a real tenant
 * board, and the endpoints themselves 404 off-sandbox. Public board
 * context no longer exposes a `sandbox` flag (SDK 2.0+ public-only types);
 * capability is proven by a successful `/sandbox/personas` read instead.
 * The switch seam is keyed by persona **id**: credentials are resolved
 * here from the roster and never cross to the browser, so the
 * authentication mechanism can change without exposing credentials or
 * changing the client contract.
 *
 * Dual-source (DMO-01): when `CAVUNO_DEMO_BOARD` is configured, every
 * preview function uses the **demo** client (personas, emails, config, reseed
 * live on the demo tenant) and stores the persona session under the demo
 * session cookie. Capability is resolved against the demo board so the
 * toolbar can render on a non-sandbox operator board.
 *
 * All Board API traffic goes through the shared SDK client's `client.fetch`
 * escape hatch (custom endpoints, no SDK release) or the existing auth
 * namespace — never a browser fetch.
 */
import { isNotFound, isUnauthorized } from '@cavuno/board';
import { type BoardSession } from '@cavuno/board/server';
import { createServerFn } from '@tanstack/react-start';
import { getRequest, setResponseHeader } from '@tanstack/react-start/server';

import { getPreviewBoard } from '../lib/board';
import {
  getDataSource,
  isDemoBoardConfigured,
  isDemoBoardPrivate,
  previewSessionSource,
  serializeSessionForSource,
} from '../lib/data-source.server';
import {
  clampEmailLimit,
  pickWhitelistedConfig,
  projectPersona,
  rejectSharedDemoMutation,
  resolveCapability,
  rewritePreviewEmailLinks,
  toOrigin,
  type PreviewActionResult,
  type PreviewCapability,
  type PreviewEmail,
  type PreviewEmailsRoster,
  type PreviewPersona,
  type PreviewRoster,
  type SandboxConfigPatch,
  type PreviewState,
  type PreviewSwitchResult,
} from '../lib/preview';
import { signOut } from './auth';

import type { DataSource } from '../lib/data-source';
import type { BoardAuthSession } from '@cavuno/board';

// ── Internal helpers (pure-ish; the exported server fns are thin wrappers) ────

/** Preview board client: demo when configured, else primary (legacy). */
function previewBoard() {
  return getPreviewBoard();
}

/**
 * Resolve v0 capability from the preview board.
 *
 * SDK 2.0 limited generated types to the public Board API and dropped
 * operator-internal fields such as `context.sandbox`. Preview is still
 * sandbox-only: probe `GET /sandbox/personas` (succeeds on sandbox,
 * 404s elsewhere) rather than reading a removed context flag.
 *
 * Sandbox-ness is deployment-static, and getPreviewState sits on the
 * root-shell critical path of EVERY request — memoize the probe per
 * isolate so both answers are paid for once, not per page, and sandbox
 * boards do not fetch the roster twice per render. Only DEFINITIVE
 * outcomes are cached (roster ok → sandbox; 404 → not sandbox); a
 * transient failure answers false for that request without being
 * cached, so a flaky network cannot lock a sandbox board out of its
 * toolbar for the isolate's lifetime.
 */
let sandboxProbe: Promise<boolean> | null = null;

function probeSandbox(): Promise<boolean> {
  sandboxProbe ??= fetchRoster().then(
    () => true,
    (error: Error) => {
      if (isNotFound(error)) return false;
      sandboxProbe = null;
      return false;
    },
  );
  return sandboxProbe;
}

async function resolveCapabilityFromBoard(): Promise<PreviewCapability> {
  return resolveCapability({ sandbox: await probeSandbox() });
}

/** Fetch the raw roster (credentials included) — SERVER-SIDE ONLY. */
function fetchRoster(): Promise<PreviewRoster> {
  return previewBoard().client.fetch<PreviewRoster>('/sandbox/personas');
}

/** Fetch captured outbound sandbox emails, newest-first — SERVER-SIDE ONLY. */
function fetchEmails(limit: number): Promise<PreviewEmailsRoster> {
  return previewBoard().client.fetch<PreviewEmailsRoster>(
    `/sandbox/emails?limit=${limit}`,
  );
}

/**
 * Retarget the board-origin links in captured emails at the frontend serving
 * the viewer. Captured mail is templated with the BOARD's canonical origin
 * (`seo().canonicalBase`, e.g. `https://sandbox.cavuno.com`), so a developer
 * running this starter locally who clicks a verify / magic link in the viewer
 * would land on the hosted board instead of their own app — breaking the
 * "every inbox flow is completable on the spot" promise. This VIEWER-ONLY
 * transform (dev tooling, sandbox-gated) diffs the board's canonical origin
 * against the request origin and rewrites only same-board-origin hrefs to the
 * request origin, preserving path/query/hash exactly; email templates and the
 * real board are never touched. A no-op when the two origins already match
 * (the viewer is served from the board's own origin) or when the canonical
 * base is unavailable.
 */
async function retargetEmailLinks(
  emails: PreviewEmail[],
): Promise<PreviewEmail[]> {
  const boardOrigin = toOrigin((await previewBoard().seo()).canonicalBase);
  const appOrigin = toOrigin(getRequest().url);
  if (!boardOrigin || !appOrigin || boardOrigin === appOrigin) return emails;
  return emails.map((email) =>
    rewritePreviewEmailLinks(email, { boardOrigin, appOrigin }),
  );
}

/**
 * Store a freshly minted persona session under the preview source's cookie
 * (demo cookie when dual-source is on — never the primary board cookie).
 */
function storeSession(session: BoardAuthSession): void {
  const next: BoardSession = {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    expiresAt: session.expiresAt,
  };
  setResponseHeader(
    'Set-Cookie',
    serializeSessionForSource(next, previewSessionSource()),
  );
}

// ── Capability ────────────────────────────────────────────────────────────

/**
 * "May this context COMPLETE a persona switch for this board?" — the single
 * server-side question that gates the whole toolbar. The shape
 * carries a reason so a future builder-preview context can answer
 * `canPreview: false, reason: 'switch-blocked'` without changing this seam.
 *
 * When `CAVUNO_DEMO_BOARD` is set, capability is probed on the **demo**
 * client (the demo tenant exposes `/sandbox/*`).
 */
export const getPreviewCapability = createServerFn({ method: 'GET' }).handler(
  (): Promise<PreviewCapability> => resolveCapabilityFromBoard(),
);

// ── Roster ──────────────────────────────────────────────────────────────────

/**
 * The browser-safe persona roster — id/role/displayName/description/states,
 * credentials stripped. Sandbox-gated server-side: `[]` on any non-sandbox
 * board (the toolbar never renders there anyway).
 */
export const listPersonas = createServerFn({ method: 'GET' }).handler(
  async (): Promise<PreviewPersona[]> => {
    const capability = await resolveCapabilityFromBoard();
    if (!capability.canPreview) return [];
    const roster = await fetchRoster();
    return roster.personas.map(projectPersona);
  },
);

/**
 * Dual-source facts that need NO preview/sandbox RPC — env + data-source
 * cookie only. Used by the root loader's getPreviewState catch so the
 * "Your board" escape hatch survives a preview RPC failure without pulling
 * data-source.server into the client bundle (import-protection denies
 * .server modules from route files).
 */
export interface PreviewDataSourceFacts {
  demoConfigured: boolean;
  demoBoardPrivate: boolean;
  dataSource: DataSource;
}

export const getDataSourceFacts = createServerFn({ method: 'GET' }).handler(
  (): PreviewDataSourceFacts => ({
    demoConfigured: isDemoBoardConfigured(),
    demoBoardPrivate: isDemoBoardPrivate(),
    dataSource: getDataSource(),
  }),
);

/**
 * Capability + roster + dual-source flags in one call — what the root loader
 * reads so the toolbar renders from loader data (components never fetch their
 * own reads). Off sandbox this is the memoized (once-per-isolate) sandbox
 * probe answering false and an empty roster.
 */
export const getPreviewState = createServerFn({ method: 'GET' }).handler(
  async (): Promise<PreviewState> => {
    const capability = await resolveCapabilityFromBoard();
    const demoConfigured = isDemoBoardConfigured();
    const demoBoardPrivate = isDemoBoardPrivate();
    const dataSource: DataSource = getDataSource();
    if (!capability.canPreview) {
      return {
        capability,
        personas: [],
        demoConfigured,
        demoBoardPrivate,
        dataSource,
      };
    }
    const roster = await fetchRoster();
    return {
      capability,
      personas: roster.personas.map(projectPersona),
      demoConfigured,
      demoBoardPrivate,
      dataSource,
    };
  },
);

// ── Captured emails (letter_opener-style viewer) ────────────────────────────

/**
 * The sandbox's captured outbound mail, newest-first — the toolbar's "Emails"
 * panel. Every board email (magic links, verification, alert-manage HMAC URLs,
 * digests) lands here so a preview session can complete flows that normally
 * require reading an inbox. `html` is platform-generated and pre-sanitized, so
 * nothing is stripped — the viewer needs it verbatim, save for a conservative
 * link-origin retarget (`retargetEmailLinks`) that points board-origin hrefs at
 * the frontend serving the viewer so those flows complete locally. Sandbox-gated
 * exactly like `listPersonas`: `[]` on any non-sandbox board (the endpoint 404s
 * there anyway), so the panel never renders real data off the sandbox. `limit`
 * is clamped to `[1, 200]` server-side (default 50) before it reaches the API.
 *
 * Dual-source: always the demo client's captures when a demo key is configured.
 */
export const listSandboxEmails = createServerFn({ method: 'GET' })
  .validator((input: { limit?: number } | undefined) => input)
  .handler(async ({ data }): Promise<PreviewEmail[]> => {
    const capability = await resolveCapabilityFromBoard();
    if (!capability.canPreview) return [];
    const roster = await fetchEmails(clampEmailLimit(data?.limit));
    // Retarget board-origin links at the viewer's own origin so inbox flows
    // (verify, magic link, alert-manage) complete in the running app, not the
    // hosted board. Viewer-only; templates and the real board are untouched.
    return retargetEmailLinks(roster.emails);
  });

// ── Switch / exit ─────────────────────────────────────────────────────────

/**
 * Switch the viewer to a seeded persona. Keyed by persona id: the server
 * resolves id → email + shared password from the roster, then runs the EXACT
 * sign-in path (`auth.login` → session cookie) so every authed loader sees a
 * real session. A failed login (401 — the persona was reseeded out from under
 * a stale menu) surfaces as a typed `persona-unavailable` result the toolbar
 * turns into a "reseed, then re-switch" affordance.
 *
 * Dual-source: login hits the demo client and the session is stored under the
 * demo cookie name so a persona token never contaminates the real-tenant
 * session.
 */
export const switchPersona = createServerFn({ method: 'POST' })
  .validator((input: { personaId: string }) => input)
  .handler(async ({ data }): Promise<PreviewSwitchResult> => {
    const capability = await resolveCapabilityFromBoard();
    if (!capability.canPreview) {
      return {
        ok: false,
        code: 'not-sandbox',
        message: 'Preview is only available on the sandbox board.',
      };
    }

    const roster = await fetchRoster();
    const persona = roster.personas.find((p) => p.id === data.personaId);
    if (!persona) {
      return {
        ok: false,
        code: 'persona-unavailable',
        message:
          'That persona is no longer in the roster — reseed, then re-switch.',
      };
    }

    try {
      const session = await previewBoard().auth.login({
        email: persona.email,
        password: roster.password,
      });
      storeSession(session);
      return {
        ok: true,
        viewer: {
          displayName: session.boardUser.displayName,
          email: session.boardUser.email,
          role: session.boardUser.role,
        },
      };
    } catch (error) {
      if (isUnauthorized(error)) {
        return {
          ok: false,
          code: 'persona-unavailable',
          message:
            'This persona was reseeded — reseed the roster, then re-switch.',
        };
      }
      throw error;
    }
  });

/**
 * Leave preview — sign out through the existing signOut path (clears the
 * active data source's session cookie). Dual-source: stays in demo mode
 * when the data-source cookie is `demo`; only the persona session ends.
 */
export const exitPreview = createServerFn({ method: 'POST' }).handler(
  async (): Promise<{ ok: true }> => {
    await signOut();
    return { ok: true };
  },
);

// ── Board settings (whitelisted feature flags) + reseed ─────────────────────

/**
 * Toggle whitelisted board-config keys on the sandbox — the toolbar's "Board
 * settings" section, the sandbox analog of the dashboard's board settings
 * `config` speaks the platform's board-config vocabulary
 * (`jobAccessPaywallEnabled`, `talentDirectoryVisibility`, …) and rides inside
 * the `{ features }` wrapper the platform's `ConfigBody` schema requires
 * (`sandbox/config/route.ts` — strict, so top-level keys 400). Non-whitelisted
 * keys are dropped first (the API whitelists too; this is defense in depth).
 * Sandbox-gated. Dual-source: always the demo client when configured.
 */
export const updateSandboxFlags = createServerFn({ method: 'POST' })
  .validator((input: { config: SandboxConfigPatch }) => input)
  .handler(async ({ data }): Promise<PreviewActionResult> => {
    const capability = await resolveCapabilityFromBoard();
    if (!capability.canPreview) {
      return {
        ok: false,
        code: 'not-sandbox',
        message: 'Board settings can only be changed on the sandbox board.',
      };
    }
    // F1: shared public demo fixtures must not accept config PATCH via RPC.
    const shared = rejectSharedDemoMutation({
      demoConfigured: isDemoBoardConfigured(),
      demoBoardPrivate: isDemoBoardPrivate(),
    });
    if (shared) return shared;

    const config = pickWhitelistedConfig(data.config);
    await previewBoard().client.fetch<{ ok: true }>('/sandbox/config', {
      method: 'PATCH',
      body: { features: config },
    });
    return { ok: true };
  });

/**
 * Reseed the sandbox personas + baseline config on demand — repairs consumed
 * demo states (a read unread badge, a hijacked credential) and decouples from
 * the nightly reset. Sandbox-gated. Dual-source: always the demo client when
 * configured (hidden in the toolbar for shared public fixtures; also rejected
 * server-side when the demo is not a private shadow — F1).
 */
export const reseedSandbox = createServerFn({ method: 'POST' }).handler(
  async (): Promise<PreviewActionResult> => {
    const capability = await resolveCapabilityFromBoard();
    if (!capability.canPreview) {
      return {
        ok: false,
        code: 'not-sandbox',
        message: 'Reseed is only available on the sandbox board.',
      };
    }
    // F1: shared public demo fixtures must not accept reseed via RPC.
    const shared = rejectSharedDemoMutation({
      demoConfigured: isDemoBoardConfigured(),
      demoBoardPrivate: isDemoBoardPrivate(),
    });
    if (shared) return shared;

    await previewBoard().client.fetch<{ ok: true }>('/sandbox/reseed', {
      method: 'POST',
    });
    return { ok: true };
  },
);
