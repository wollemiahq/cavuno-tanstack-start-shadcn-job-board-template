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
import { resolveBoardAds } from '../lib/board-ads';
import { getBoard } from '../lib/board';
import { withApplyGatewayCapability } from '../lib/board';
import { boardAccessMiddleware } from '../lib/board-access-middleware';
import {
  readBoardContext,
  readStaleBoardContext,
  refreshBoardContext,
  readEmployerOfferGate,
} from '../lib/board-context-cache';
import { boardGlobalReadCache } from '../lib/read-cache';
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
  PlacesListQuery,
  PlansListQuery,
  PublicBlogAdjacentPosts,
  TalentDirectoryQuery,
  TaxonomyResolution,
} from '@cavuno/board';

// ── OPEN reads (allowlisted-open on the hosted board, even when protected) ──

function resolveBoardContext(
  context: Awaited<ReturnType<typeof readBoardContext>>,
) {
  return {
    ...context,
    // Runtime feature flags are resolved to clean typed booleans here at
    // the single context boundary — absent ⇒ on. See
    // src/board/board-feature-flags.ts for the additive polarity.
    features: {
      ...context.features,
      ...resolveRuntimeFeatureFlags(context.features),
    },
    // Contact/social only. Footer description, nav order, and custom
    // links are src/chrome.json (baked at Prepare). Do not read the
    // soon-deleted Puck/settings copy fields off the wire.
    footer: {
      contactEmail: context.contact?.email ?? null,
      websiteUrl: context.contact?.websiteUrl ?? null,
      xUrl: context.contact?.xUrl ?? null,
      facebookUrl: context.contact?.facebookUrl ?? null,
      linkedinUrl: context.contact?.linkedinUrl ?? null,
    } satisfies BoardContextFooter,
    // 4.0.0: talent directory is features.talentDirectory enum ('off' is truthy!).
    talentDirectoryVisibility: context.features.talentDirectory,
    // The `analytics` group is in the published SDK types, but an API
    // deployment predating it would omit it from the body — default to
    // "no trackers, no consent gate" rather than faulting the root render.
    analytics: context.analytics ?? {
      ga4MeasurementId: null,
      gtmId: null,
      metaPixelId: null,
      linkedInPartnerId: null,
      cookieConsentRequired: false,
    },
    // Older SDKs omit `ads`; treat missing as off. Publisher id comes from
    // Cavuno advertising settings; slot ids stay in src/ads.json.
    ads: resolveBoardAds(context),
  };
}

export const getBoardContext = createServerFn({ method: 'GET' }).handler(
  async () => resolveBoardContext(await readBoardContext()),
);

/**
 * Fresh context for operator-controlled kill-switch enforcement. This read
 * bypasses both cache layers and refreshes the isolate memo for later reads.
 */
export const getFreshBoardContext = createServerFn({ method: 'GET' }).handler(
  async () => resolveBoardContext(await refreshBoardContext()),
);

/** Last successful context, only for a fail-closed shell after fresh failure. */
export const getStaleBoardContext = createServerFn({ method: 'GET' }).handler(
  async () => {
    const stale = readStaleBoardContext();
    return resolveBoardContext(await (stale ?? readBoardContext()));
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
      // Board-global, always-anonymous reads on the root loader's critical
      // path — edge-cache them with the longer board-global TTL, and memo
      // the boolean gate per isolate so soft root re-runs do not re-hit
      // plans.list + salesLed.
      return await readEmployerOfferGate(async () => {
        const [plans, salesLed] = await Promise.all([
          getBoard().plans.list({}, boardGlobalReadCache()),
          getBoard().plans.salesLed(boardGlobalReadCache()),
        ]);
        return {
          hasEmployerOfferPage:
            plans.data.length > 0 || salesLed.data.length > 0,
        };
      });
    } catch {
      // Fail closed: this gate runs on the root loader for every route, so a
      // transient plan-read failure (or a password-gated board) must only
      // hide the footer/nav Pricing links, never fault the whole page.
      return { hasEmployerOfferPage: false };
    }
  },
);

/**
 * SEO base for a listing page's `head` — the board name + language + the
 * request origin (for absolute `<link rel=canonical>` / `og:url`). A server fn
 * so `getRequest` resolves on both SSR and client navigation; the board
 * context read is memoized per isolate (src/lib/board-context-cache.ts) —
 * the SDK client does NOT cache it, and this value is read again by the
 * root shell on the same document. The language feeds the
 * board-language-required `@cavuno/board/seo` helpers.
 */
export const getSeoBase = createServerFn({ method: 'GET' }).handler(
  async () => {
    const board = await readBoardContext();
    return {
      boardName: board.name,
      language: board.language,
      // Operator label overrides — head/meta copy resolves through the same
      // route-owned copy families as the rendered blocks.
      origin: new URL(getRequest().url).origin,
    };
  },
);

/**
 * Board SEO infra tokens only (`adsTxt`, IndexNow, GSV, `canonicalBase`,
 * `manifest.name`). Favicon / app-icon URLs are brand identity on
 * `board.context()` (`logoUrl` + `icons`), not this endpoint.
 */
export const getBoardSeo = createServerFn({ method: 'GET' }).handler(async () =>
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
      getBoard().jobs.retrieve(data.jobSlug, undefined, {
        headers: withApplyGatewayCapability(h),
      }),
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

/** Category/skill autocomplete for the shared Jobs keyword field. */
export const searchTaxonomySuggestions = createServerFn({ method: 'GET' })
  .validator((input: { q?: string; limit?: number }) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async (h) => {
      const result = await getBoard().search.suggest(
        {
          q: data.q,
          limit: data.limit,
          types: ['category', 'skill'],
        },
        { headers: h },
      );
      // Preserve the prior `{ data: TaxonomyTerm[] }` shape the keyword
      // combobox mapper expects (type + displayName + canonicalSlug).
      return {
        data: result.items
          .filter(
            (
              item,
            ): item is Extract<
              typeof item,
              { type: 'term'; termType: 'category' | 'skill' }
            > => item.type === 'term',
          )
          .map((item) => ({
            object: 'taxonomy_term' as const,
            id: item.id,
            type: item.termType,
            sourceSlug: item.sourceSlug,
            canonicalSlug: item.canonicalSlug,
            displayName: item.displayName,
          })),
      };
    }),
  );

/** Post/tag autocomplete for the blog search field (ADR-0102 suggest kinds). */
export const searchBlogSuggestions = createServerFn({ method: 'GET' })
  .validator((input: { q?: string; limit?: number }) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async (h) => {
      const result = await getBoard().search.suggest(
        {
          q: data.q,
          limit: data.limit,
          types: ['post', 'tag'],
        },
        { headers: h },
      );
      return {
        data: result.items
          .filter(
            (item): item is Extract<typeof item, { type: 'post' | 'tag' }> =>
              item.type === 'post' || item.type === 'tag',
          )
          .map((item) =>
            item.type === 'post'
              ? { type: 'post' as const, slug: item.slug, title: item.title }
              : { type: 'tag' as const, slug: item.slug, name: item.name },
          ),
      };
    }),
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

// ── Candidate-profile / talent (public read) ─────────────────────────────────
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

// ── Employer pricing / plans ─────────────────────────────────────────────────

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
 * display name, and a `redirectTo` the market page 308s to. Returns
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
 * The API rejects every blog read with `blog_disabled` (422) when the
 * board's blog feature is off. A disabled feature must read as ABSENT on
 * the board — parity with the hosted board's notFound gate — so map it to
 * the route-level 404 rather than surfacing a 500. Thrown notFound()
 * serializes across the server-fn boundary to the loader.
 */
type BoardErrorLike = {
  code?: string;
};

function isBlogDisabled<T>(error: T): boolean {
  if (error === null || error === undefined || Object(error) !== error) {
    return false;
  }
  // SAFETY: Caught Board API errors may expose a string `code`; this guard
  // only reads that optional field and treats all other shapes as non-blog errors.
  return (error as BoardErrorLike).code === 'blog_disabled';
}

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

export const EMPTY_ADJACENT: PublicBlogAdjacentPosts = {
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

// ── Programmatic taxonomy pages ──────────────────────────────────────────────
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

// ── Salary pages ─────────────────────────────────────────────────────────────
// Stats are English-keyed; the REQUEST locale drives the read-time overlay
// (localized names + canonical slugs). Unprefixed routes resolve to the base
// locale (=== board language, a generation-time invariant); /de/-style chrome
// prefixes localize entity data too. A 404 (no salary stats)
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

// ── Company salary pages ─────────────────────────────────────────────────────
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
 * Company salary presence — the honest gate for the section shell's
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
 * Company salary summary — the condensed salary block for the
 * company Overview tab. Hits the lightweight `salaries/summary` endpoint
 * (overall + top categories + sampleCount) so the Overview does not pay for
 * the full company-salary document. The Overview derives `hasSalaries` (the
 * tab gate) from `company.salarySampleCount` when available; this payload
 * still 404s-as-empty when there is no sample. Category rows are already
 * top-N on the wire; we keep a local slice as a hard cap.
 */
const COMPANY_SALARY_SUMMARY_CATEGORIES = 5;

export const getCompanySalarySummary = createServerFn({ method: 'GET' })
  .validator((input: { companySlug: string }) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async (h) => {
      try {
        const salary = await getBoard().companies.salaries.summary(
          data.companySlug,
          { headers: h },
        );
        return {
          overallSalary: salary.overallSalary,
          byCategory: salary.topCategories.slice(
            0,
            COMPANY_SALARY_SUMMARY_CATEGORIES,
          ),
          currency: salary.currency,
        };
      } catch (error) {
        if (isNotFound(error))
          return { overallSalary: null, byCategory: [], currency: null };
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
