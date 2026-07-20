import { isNotFound } from '@cavuno/board';
/**
 * Anonymous read server functions — the data layer route loaders call.
 *
 * Every Board API call happens server-side (server functions always
 * execute on the server, even during client navigation), so the browser
 * never talks to the API directly and display components stay dumb,
 * typed-props-driven consumers of loader data.
 *
 * CONTENT reads wrap the SDK call in `gatedRead` (with the boardAccess
 * middleware) — they carry the board-password grant from the host cookie and,
 * on a protected board with no grant, redirect to /password (parity with the
 * hosted board's wall). The board context + SEO base stay OPEN (the hosted
 * board serves them publicly, and the /password challenge needs the brand).
 */
import { notFound } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';

import { resolveRuntimeFeatureFlags } from '../board/board-feature-flags';
import { getBoard } from '../lib/board';
import { boardAccessMiddleware } from '../lib/board-access-middleware';
import { getServerEnv } from '../lib/env';
import { getLocale } from '../paraglide/runtime';
import { gatedRead } from './board-access';
import { readTalentDirectory } from './talent-directory-read';

import type { BoardContextFooter } from '../components/Footer';
import type {
  BlogPostsListQuery,
  BlogSearchBody,
  CompaniesListQuery,
  CompaniesSearchBody,
  CompanyMarketsListQuery,
  EmbedJobsQuery,
  JobAlertDeletePreferenceInput,
  JobAlertManageQuery,
  JobAlertManageTokenInput,
  JobAlertSubscribeInput,
  JobAlertUpdatePreferenceInput,
  JobsListQuery,
  JobsSearchBody,
  LegalPageType,
  PlacesListQuery,
  TaxonomyListQuery,
  PlansListQuery,
  PublicBlogAdjacentPosts,
  SuggestionsListQuery,
  TalentDirectoryQuery,
  TaxonomyResolution,
} from '@cavuno/board';

/**
 * The wire theme's `colors` is typed loosely in the SDK
 * (`Record<string, unknown>`) but is concretely string color values —
 * narrow once here at the boundary so server-fn serializability checks
 * and the theme mapper both get the real shape.
 */
export interface SerializableThemeColors {
  light?: Record<string, string>;
  dark?: Record<string, string>;
}

// ── OPEN reads (allowlisted-open on the hosted board, even when protected) ──

export const getBoardContext = createServerFn({ method: 'GET' }).handler(
  async () => {
    const context = await getBoard().context();
    // The `footer` group + talent tri-state (hosted-footer parity slice)
    // ride the wire ahead of the published SDK types — pick them off the
    // body defensively; null against an API deployment predating the slice.
    const parity = context as {
      footer?: BoardContextFooter;
      talentDirectoryVisibility?: 'off' | 'public' | 'employers_only';
    };
    return {
      ...context,
      // Runtime feature flags (Board PR #968) resolved to clean typed
      // booleans here at the single context boundary — absent ⇒ on. See
      // src/board/board-feature-flags.ts for the additive polarity + the
      // SDK-types TODO.
      features: {
        ...context.features,
        ...resolveRuntimeFeatureFlags(context.features),
      },
      footer: parity.footer ?? null,
      talentDirectoryVisibility: parity.talentDirectoryVisibility ?? null,
      theme: context.theme
        ? {
            ...context.theme,
            colors: context.theme.colors as SerializableThemeColors,
          }
        : null,
    };
  },
);

/**
 * Whether /employers has anything to sell — self-service plans, talent
 * plans, or sales-led plans — the hosted `hasEmployerOfferPage` gate the
 * footer/nav Pricing links key on. OPEN read on an open board; a
 * password-protected board refuses ungated plan reads, so the links hide
 * until the wall is passed (the wall page renders no footer nav anyway).
 */
export const getEmployerOfferGate = createServerFn({ method: 'GET' }).handler(
  async () => {
    try {
      const [plans, salesLed] = await Promise.all([
        getBoard().plans.list({}),
        getBoard().plans.salesLed(),
      ]);
      return {
        hasEmployerOfferPage: plans.data.length > 0 || salesLed.data.length > 0,
      };
    } catch {
      // Fail closed: this gate runs on the root loader for every route, so a
      // transient plan-read failure (or a password-gated board) must only
      // hide the footer/nav Pricing links, never fault the whole page.
      return { hasEmployerOfferPage: false };
    }
  },
);

/**
 * Deployment analytics config (cutover runbook P2): the publishable
 * Tinybird tracker token, read server-side (cloudflare:workers env can't
 * be imported by client code) and threaded to the root document's flock
 * script tag. Null ⇒ analytics disabled, no script tag.
 */
export const getAnalyticsConfig = createServerFn({ method: 'GET' }).handler(
  async () => ({ trackerToken: getServerEnv().trackerToken }),
);

/**
 * SEO base for a listing page's `head` — the board name + language + the
 * request origin (for absolute `<link rel=canonical>` / `og:url`). A server fn
 * so `getRequest` resolves on both SSR and client navigation; the board
 * context is already cached by the SDK client. The language feeds the
 * board-language-required `@cavuno/board/seo` helpers (ADR-0057).
 */
export const getSeoBase = createServerFn({ method: 'GET' }).handler(
  async () => {
    const board = await getBoard().context();
    return {
      boardName: board.name,
      language: board.language,
      // Operator label overrides (ADR-0059) — head/meta copy resolves
      // boardCopy(language, labels) same as the blocks.
      labels: board.labels,
      origin: new URL(getRequest().url).origin,
    };
  },
);

/**
 * Board SEO infra (resolved favicon/app-icon URLs + web-manifest meta + the
 * canonical base) for the root <head>. OPEN — the hosted board serves these
 * publicly even when password-protected.
 */
export const getBoardSeo = createServerFn({ method: 'GET' }).handler(() =>
  getBoard().seo(),
);

// ── GATED content reads (behind the board-password wall) ────────────────────

export const listJobs = createServerFn({ method: 'GET' })
  .validator((input: JobsListQuery) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, (h) => getBoard().jobs.list(data, { headers: h })),
  );

export const searchJobs = createServerFn({ method: 'GET' })
  .validator((input: JobsSearchBody) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, (h) =>
      getBoard().jobs.search(data, undefined, { headers: h }),
    ),
  );

/**
 * Embeddable jobs widget read — UNGATED at the candidate-paywall level (the API
 * never truncates `/embed/jobs`), but STILL behind the board password wall, so
 * it carries the grant via `gatedRead` exactly like the other content reads.
 */
export const embedJobs = createServerFn({ method: 'GET' })
  .validator((input: EmbedJobsQuery) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, (h) => getBoard().embed.jobs(data, { headers: h })),
  );

export const getJob = createServerFn({ method: 'GET' })
  .validator((input: { jobSlug: string }) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, (h) =>
      getBoard().jobs.retrieve(data.jobSlug, undefined, { headers: h }),
    ),
  );

/**
 * Location autocomplete — `places.list({ q })` powers the listing search bar's
 * location field. Gated like the other content reads (the hosted board's
 * places endpoint sits behind the password wall too).
 */
export const searchPlaces = createServerFn({ method: 'GET' })
  .validator((input: PlacesListQuery) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, (h) =>
      getBoard().taxonomy.places.list(data, { headers: h }),
    ),
  );

/**
 * The canonical remote-permit taxonomy (worldwide / world regions / country
 * groups like EU or DACH / countries) — the option space for the posting
 * form's geographic restriction. Platform reference data served
 * board-scoped; gated like the other taxonomy reads.
 */
export const getRemotePermits = createServerFn({ method: 'GET' })
  .middleware([boardAccessMiddleware])
  .handler(({ context }) =>
    gatedRead(context, (h) =>
      getBoard().taxonomy.remotePermits.list({ headers: h }),
    ),
  );

/**
 * The board's job categories — name + slug only; the endpoint carries no job
 * counts, so callers link out rather than quantify.
 */
export const listCategories = createServerFn({ method: 'GET' })
  .validator((input: TaxonomyListQuery) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, (h) =>
      getBoard().taxonomy.categories.list(data, { headers: h }),
    ),
  );

/** Category/skill autocomplete for the shared Jobs keyword field. */
export const searchTaxonomySuggestions = createServerFn({ method: 'GET' })
  .validator((input: SuggestionsListQuery) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, (h) =>
      getBoard().taxonomy.suggestions.list(data, { headers: h }),
    ),
  );

// ── Job alerts (anonymous, double opt-in — public endpoints, no grant) ───────

export const subscribeJobAlert = createServerFn({ method: 'POST' })
  .validator((input: JobAlertSubscribeInput) => input)
  .handler(({ data }) => getBoard().jobAlerts.subscribe(data));

export const confirmJobAlert = createServerFn({ method: 'POST' })
  .validator((input: { token: string }) => input)
  .handler(({ data }) => getBoard().jobAlerts.confirm(data));

export const resendJobAlertConfirmation = createServerFn({ method: 'POST' })
  .validator((input: { email: string }) => input)
  .handler(({ data }) => getBoard().jobAlerts.resendConfirmation(data));

export const getJobAlertManageState = createServerFn({ method: 'GET' })
  .validator((input: JobAlertManageQuery) => input)
  .handler(({ data }) => getBoard().jobAlerts.manage(data));

export const unsubscribeJobAlert = createServerFn({ method: 'POST' })
  .validator((input: JobAlertManageTokenInput) => input)
  .handler(({ data }) => getBoard().jobAlerts.unsubscribe(data));

export const resubscribeJobAlert = createServerFn({ method: 'POST' })
  .validator((input: JobAlertManageTokenInput) => input)
  .handler(({ data }) => getBoard().jobAlerts.resubscribe(data));

export const updateJobAlertPreference = createServerFn({ method: 'POST' })
  .validator((input: JobAlertUpdatePreferenceInput) => input)
  .handler(({ data }) => getBoard().jobAlerts.updatePreference(data));

export const deleteJobAlertPreference = createServerFn({ method: 'POST' })
  .validator((input: JobAlertDeletePreferenceInput) => input)
  .handler(({ data }) => getBoard().jobAlerts.deletePreference(data));

export const getSimilarJobs = createServerFn({ method: 'GET' })
  .validator((input: { jobSlug: string; limit?: number }) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, (h) =>
      getBoard().jobs.similar(
        data.jobSlug,
        { limit: data.limit },
        { headers: h },
      ),
    ),
  );

export const resolveRedirect = createServerFn({ method: 'GET' })
  .validator((input: { path: string }) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, (h) =>
      getBoard().redirects.resolve(data.path, { headers: h }),
    ),
  );

export const listCompanies = createServerFn({ method: 'GET' })
  .validator((input: CompaniesListQuery) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, (h) => getBoard().companies.list(data, { headers: h })),
  );

export const searchCompanies = createServerFn({ method: 'GET' })
  .validator((input: CompaniesSearchBody) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, (h) =>
      getBoard().companies.search(data, undefined, { headers: h }),
    ),
  );

export const getCompany = createServerFn({ method: 'GET' })
  .validator((input: { companySlug: string }) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, (h) =>
      getBoard().companies.retrieve(data.companySlug, undefined, {
        headers: h,
      }),
    ),
  );

// ── Candidate-profile / talent (roadmap §K, public read) ─────────────────────
// The directory throws `talent_directory_restricted` (403) on an employers-only
// board — the route loader catches it to render the upsell; both reads are gated
// behind the board-password wall like the other content reads.

export const listTalent = createServerFn({ method: 'GET' })
  .validator((input: TalentDirectoryQuery) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    readTalentDirectory(() =>
      gatedRead(context, (h) => getBoard().talent.list(data, { headers: h })),
    ),
  );

export const getTalentProfile = createServerFn({ method: 'GET' })
  .validator((input: { handle: string }) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, (h) =>
      getBoard().talent.retrieve(data.handle, { headers: h }),
    ),
  );

// ── Employer pricing / plans (roadmap §L, ADR-0047) ──────────────────────────

export const listPlans = createServerFn({ method: 'GET' })
  .validator((input: PlansListQuery) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, (h) => getBoard().plans.list(data, { headers: h })),
  );

export const listSalesLedPlans = createServerFn({ method: 'GET' })
  .middleware([boardAccessMiddleware])
  .handler(({ context }) =>
    gatedRead(context, (h) => getBoard().plans.salesLed({ headers: h })),
  );

export const listCompanyJobs = createServerFn({ method: 'GET' })
  .validator(
    (input: { companySlug: string; cursor?: string; limit?: number }) => input,
  )
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, (h) =>
      getBoard().companies.listJobs(
        data.companySlug,
        { cursor: data.cursor, limit: data.limit },
        { headers: h },
      ),
    ),
  );

/**
 * Similar-companies rail — progressive enhancement on the company page. Degrades
 * to empty if the endpoint is absent (mirrors the blog similar rail); a search
 * outage (503) propagates rather than masquerading as "no similar companies".
 */
export const getSimilarCompanies = createServerFn({ method: 'GET' })
  .validator((input: { companySlug: string; limit?: number }) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async (h) => {
      try {
        return await getBoard().companies.similar(
          data.companySlug,
          { limit: data.limit },
          { headers: h },
        );
      } catch (error) {
        if (isNotFound(error))
          return {
            object: 'list' as const,
            data: [],
            hasMore: false,
            nextCursor: null,
          };
        throw error;
      }
    }),
  );

/** The board's company markets (sectors), ranked by company count. */
export const getCompanyMarkets = createServerFn({ method: 'GET' })
  .validator((input: CompanyMarketsListQuery) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, (h) =>
      getBoard().companies.markets(data, { headers: h }),
    ),
  );

/**
 * Resolve a company-market slug to its page-meta — the canonical/source slug,
 * display name, and a `redirectTo` the market page 308s to (CAV-291). Returns
 * `null` on a 404 so the route loader can `notFound()` (mirrors resolve*).
 */
export const getCompanyMarket = createServerFn({ method: 'GET' })
  .validator((input: { market: string }) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, (h) =>
      resolveOrNull(
        getBoard().companies.markets.resolve(data.market, { headers: h }),
      ),
    ),
  );

/**
 * A legal/about page — owner prose as portable HTML (+ impressum legal-entity
 * facts). Gated like the other content reads. The loader maps a 404
 * (`board_page_not_found` — impressum disabled / unknown type) to `notFound()`.
 */
export const getLegalPage = createServerFn({ method: 'GET' })
  .validator((input: { type: LegalPageType }) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, (h) =>
      getBoard().legal.retrieve(data.type, { headers: h }),
    ),
  );

/**
 * The API rejects every blog read with `blog_disabled` (422) when the
 * board's blog feature is off. A disabled feature must read as ABSENT on
 * the board — parity with the hosted board's notFound gate — so map it to
 * the route-level 404 rather than surfacing a 500. Thrown notFound()
 * serializes across the server-fn boundary to the loader.
 */
const isBlogDisabled = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  (error as { code?: unknown }).code === 'blog_disabled';

const blogRead = async <T>(read: () => Promise<T>): Promise<T> => {
  try {
    return await read();
  } catch (error) {
    if (isBlogDisabled(error)) throw notFound();
    throw error;
  }
};

export const listBlogPosts = createServerFn({ method: 'GET' })
  .validator((input: BlogPostsListQuery) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, (h) =>
      blogRead(() => getBoard().blog.posts.list(data, { headers: h })),
    ),
  );

export const getBlogPost = createServerFn({ method: 'GET' })
  .validator((input: { postSlug: string }) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, (h) =>
      blogRead(() =>
        getBoard().blog.posts.retrieve(data.postSlug, undefined, {
          headers: h,
        }),
      ),
    ),
  );

export const searchBlogPosts = createServerFn({ method: 'GET' })
  .validator((input: BlogSearchBody) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, (h) =>
      blogRead(() => getBoard().blog.search(data, undefined, { headers: h })),
    ),
  );

const EMPTY_ADJACENT: PublicBlogAdjacentPosts = {
  object: 'blog_adjacent_posts',
  previous: null,
  next: null,
};

// prev/next + related are progressive-enhancement rails: if the endpoint is
// absent (a deployment that predates them → 404), degrade to empty rather than
// failing the whole detail page. The BoardApiError is caught HERE (same process
// as the SDK call) — it would not survive the server-fn RPC boundary.
export const getBlogPostAdjacent = createServerFn({ method: 'GET' })
  .validator((input: { postSlug: string }) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async (h) => {
      try {
        return await blogRead(() =>
          getBoard().blog.posts.adjacent(data.postSlug, { headers: h }),
        );
      } catch (error) {
        if (isNotFound(error)) return EMPTY_ADJACENT;
        throw error;
      }
    }),
  );

export const listBlogTags = createServerFn({ method: 'GET' })
  .validator((input: Record<string, never>) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ context }) =>
    gatedRead(context, (h) =>
      blogRead(() => getBoard().blog.tags.list(undefined, { headers: h })),
    ),
  );

export const getBlogTag = createServerFn({ method: 'GET' })
  .validator((input: { tagSlug: string }) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, (h) =>
      blogRead(() =>
        getBoard().blog.tags.retrieve(data.tagSlug, undefined, { headers: h }),
      ),
    ),
  );

export const getBlogAuthor = createServerFn({ method: 'GET' })
  .validator((input: { authorSlug: string }) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, (h) =>
      blogRead(() =>
        getBoard().blog.authors.retrieve(data.authorSlug, undefined, {
          headers: h,
        }),
      ),
    ),
  );

// ── Programmatic taxonomy pages (ADR-0037 §7) ──────────────────────────────
// resolve* return null on a 404 so the route loader can `throw notFound()`.
// The BoardApiError instance is intact here (same process as the SDK call);
// it would not survive the server-fn RPC boundary back to the loader.

async function resolveOrNull(
  promise: Promise<TaxonomyResolution>,
): Promise<TaxonomyResolution | null> {
  try {
    return await promise;
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

export const resolveCategory = createServerFn({ method: 'GET' })
  .validator((input: { slug: string }) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, (h) =>
      resolveOrNull(
        getBoard().taxonomy.categories.resolve(data.slug, { headers: h }),
      ),
    ),
  );

export const resolveSkill = createServerFn({ method: 'GET' })
  .validator((input: { slug: string }) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, (h) =>
      resolveOrNull(
        getBoard().taxonomy.skills.resolve(data.slug, { headers: h }),
      ),
    ),
  );

export const resolvePlace = createServerFn({ method: 'GET' })
  .validator((input: { slug: string }) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, (h) =>
      resolveOrNull(
        getBoard().taxonomy.places.resolve(data.slug, { headers: h }),
      ),
    ),
  );

export const listPlaces = createServerFn({ method: 'GET' })
  .middleware([boardAccessMiddleware])
  .handler(({ context }) =>
    gatedRead(context, (h) =>
      getBoard().taxonomy.places.list(undefined, { headers: h }),
    ),
  );

// ── Salary pages (ADR-0041) ─────────────────────────────────────────────────
// Stats are English-keyed; the REQUEST locale drives the read-time overlay
// (localized names + canonical slugs). Unprefixed routes resolve to the base
// locale (=== board language, a generation-time invariant); /de/-style chrome
// prefixes localize entity data too (ADR-0063 D4). A 404 (no salary stats)
// propagates as a BoardApiError the route loader maps to `notFound()`.

export const getTitleSalary = createServerFn({ method: 'GET' })
  .validator((input: { slug: string }) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async (h) => {
      return getBoard().salaries.titles.retrieve(
        data.slug,
        { locale: getLocale() },
        { headers: h },
      );
    }),
  );

export const getSkillSalary = createServerFn({ method: 'GET' })
  .validator((input: { slug: string }) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async (h) => {
      return getBoard().salaries.skills.retrieve(
        data.slug,
        { locale: getLocale() },
        { headers: h },
      );
    }),
  );

export const getLocationSalary = createServerFn({ method: 'GET' })
  .validator((input: { slug: string }) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async (h) => {
      return getBoard().salaries.locations.retrieve(
        data.slug,
        { locale: getLocale() },
        { headers: h },
      );
    }),
  );

// ── Salary index hubs (Tier 2) — the /salaries hub composes the four ────────

export const listSalaryCompanies = createServerFn({ method: 'GET' })
  .middleware([boardAccessMiddleware])
  .handler(({ context }) =>
    gatedRead(context, (h) =>
      getBoard().salaries.companies.list({ headers: h }),
    ),
  );

export const listSalaryTitles = createServerFn({ method: 'GET' })
  .middleware([boardAccessMiddleware])
  .handler(({ context }) =>
    gatedRead(context, async (h) => {
      return getBoard().salaries.titles.list(
        { locale: getLocale() },
        { headers: h },
      );
    }),
  );

export const listSalarySkills = createServerFn({ method: 'GET' })
  .middleware([boardAccessMiddleware])
  .handler(({ context }) =>
    gatedRead(context, async (h) => {
      return getBoard().salaries.skills.list(
        { locale: getLocale() },
        { headers: h },
      );
    }),
  );

export const listSalaryLocations = createServerFn({ method: 'GET' })
  .middleware([boardAccessMiddleware])
  .handler(({ context }) =>
    gatedRead(context, async (h) => {
      return getBoard().salaries.locations.list(
        { locale: getLocale() },
        { headers: h },
      );
    }),
  );

// ── Salary cross-axis (Tier 3) — title×location, skill×location ─────────────

export const getTitleLocations = createServerFn({ method: 'GET' })
  .validator((input: { slug: string }) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async (h) => {
      return getBoard().salaries.titles.locations(
        data.slug,
        { locale: getLocale() },
        { headers: h },
      );
    }),
  );

export const getSkillLocations = createServerFn({ method: 'GET' })
  .validator((input: { slug: string }) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async (h) => {
      return getBoard().salaries.skills.locations(
        data.slug,
        { locale: getLocale() },
        { headers: h },
      );
    }),
  );

export const getLocationTitles = createServerFn({ method: 'GET' })
  .validator((input: { slug: string }) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async (h) => {
      return getBoard().salaries.locations.titles(
        data.slug,
        { locale: getLocale() },
        { headers: h },
      );
    }),
  );

export const getLocationSkills = createServerFn({ method: 'GET' })
  .validator((input: { slug: string }) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async (h) => {
      return getBoard().salaries.locations.skills(
        data.slug,
        { locale: getLocale() },
        { headers: h },
      );
    }),
  );

export const getTitleLocationSalary = createServerFn({ method: 'GET' })
  .validator((input: { slug: string; locationSlug: string }) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async (h) => {
      return getBoard().salaries.titles.location(
        data.slug,
        data.locationSlug,
        { locale: getLocale() },
        { headers: h },
      );
    }),
  );

export const getSkillLocationSalary = createServerFn({ method: 'GET' })
  .validator((input: { slug: string; locationSlug: string }) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async (h) => {
      return getBoard().salaries.skills.location(
        data.slug,
        data.locationSlug,
        { locale: getLocale() },
        { headers: h },
      );
    }),
  );

// ── Company salary pages (ADR-0046) ─────────────────────────────────────────
// The overview takes no locale — the loader localizes `byCategory` by the board
// language internally; the company slug/name are never localized. The category
// route passes the request locale (base locale === board language on
// unprefixed routes — the usage that keeps name + slug consistent).

export const getCompanySalary = createServerFn({ method: 'GET' })
  .validator((input: { companySlug: string }) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, (h) =>
      getBoard().companies.salaries(data.companySlug, { headers: h }),
    ),
  );

/**
 * Company salary presence (CAV-512) — the honest gate for the section shell's
 * Salaries tab. There is no board-level salaries feature flag: a company's
 * salary overview exists purely as a function of its jobs' salary data, and
 * the endpoint 404s when there is none (the salary route renders its empty
 * state on that 404). So the tab is shown ONLY when the endpoint resolves AND
 * carries real content (an overall aggregate or per-category rows) — a company
 * with no salary data earns no dead tab. Reuses the full retrieve (there is no
 * lighter existence endpoint); the Overview/Jobs loaders run it in parallel.
 */
export const getCompanySalaryPresence = createServerFn({ method: 'GET' })
  .validator((input: { companySlug: string }) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async (h) => {
      try {
        const salary = await getBoard().companies.salaries(data.companySlug, {
          headers: h,
        });
        return salary.overallSalary !== null || salary.byCategory.length > 0;
      } catch (error) {
        if (isNotFound(error)) return false;
        throw error;
      }
    }),
  );

/**
 * Company salary SUMMARY (CAV-516) — the condensed salary block for the
 * company Overview tab. Returns the company's overall salary range plus the
 * top few category rows, so the Overview can render a "Salaries" summary that
 * defers to the full Salaries tab. The Overview derives `hasSalaries` (the tab
 * gate) from this same payload, so it fetches salary data ONCE — it does NOT
 * also call `getCompanySalaryPresence` (that boolean-only gate stays for the
 * Jobs subpage, which needs the flag but not the data). Same endpoint + same
 * 404-is-no-data honesty as the presence gate; the byCategory rows are capped
 * to the summary's top N (the full list lives on the Salaries tab).
 */
const COMPANY_SALARY_SUMMARY_CATEGORIES = 5;

export const getCompanySalarySummary = createServerFn({ method: 'GET' })
  .validator((input: { companySlug: string }) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async (h) => {
      try {
        const salary = await getBoard().companies.salaries(data.companySlug, {
          headers: h,
        });
        return {
          overallSalary: salary.overallSalary,
          byCategory: salary.byCategory.slice(
            0,
            COMPANY_SALARY_SUMMARY_CATEGORIES,
          ),
        };
      } catch (error) {
        if (isNotFound(error)) return { overallSalary: null, byCategory: [] };
        throw error;
      }
    }),
  );

export const getCompanyCategorySalary = createServerFn({ method: 'GET' })
  .validator((input: { companySlug: string; categorySlug: string }) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async (h) => {
      return getBoard().companies.salaries.category(
        data.companySlug,
        data.categorySlug,
        { locale: getLocale() },
        { headers: h },
      );
    }),
  );
