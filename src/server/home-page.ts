/**
 * Route-owned server boundary for the home landing `/`.
 *
 * Head meta + ItemList JSON-LD live here so the route module never imports
 * `@cavuno/board/seo` into the universal client entry (and so React 19
 * streaming SSR reliably emits ld+json via head scripts — body `<JsonLd>`
 * was non-deterministic on `/`).
 *
 * Folds the home loader's multi-RPC fan-out (getBoardContext, listJobs,
 * listCompanies, listTopJobCategories, getSeoBase, optional blog/talent)
 * into a single getHomePage call so client navigation does not grow.
 */
import { listingJsonLd } from '@cavuno/board/seo';
import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';

import { getBoard } from '../lib/board';
import { boardAccessMiddleware } from '../lib/board-access-middleware';
import { readBoardContext } from '../lib/board-context-cache';
import { headTitle } from '../lib/page-title';
import { m } from '../paraglide/messages';
import { gatedRead } from './board-access';
import { readTalentDirectory } from './talent-directory-read';

import { breadcrumbsCopy } from '@/copy-groups/breadcrumbs';
import { selfUrl } from '@/lib/self-url';
import type { RelatedSearch } from '@cavuno/board';

/**
 * JSON-LD is schema.org-shaped nested objects. TanStack Start's server-fn
 * serializer rejects `Record<string, unknown>` (`unknown` is not serializable),
 * so we reify the builders' output as a plain JSON value tree.
 */
type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
type JsonObject = { [key: string]: JsonValue };

function asJsonObjects<T>(value: T): JsonObject[] {
  // SAFETY: Structured data is composed from literal schema.org objects and
  // SDK SEO builders, then JSON round-tripped to erase readonly helper types.
  return JSON.parse(JSON.stringify(value)) as JsonObject[];
}

/** Enough rows for the home job rail and for relatedSearches category facets. */
const HOME_JOBS_LIST_LIMIT = 20;
const HOME_JOB_RAIL_LIMIT = 8;

export const getHomePage = createServerFn({ method: 'GET' })
  .middleware([boardAccessMiddleware])
  .handler(({ context }) =>
    gatedRead(context, async (headers) => {
      const board = getBoard();
      // Board context is an OPEN read (password wall does not gate it),
      // matching getSeoBase / getJobDetailPage. Content reads use headers.
      const boardContextP = readBoardContext();
      // One jobs.list feeds both the 8-card rail and top-category facets
      // (relatedSearches). A second list({ limit: 20 }) was pure over-fetch.
      const jobsListP = board.jobs.list(
        { limit: HOME_JOBS_LIST_LIMIT },
        { headers },
      );
      // Additive companies strip — fail soft so a rejecting preview never
      // faults the whole landing.
      const companiesP = board.companies
        .list({ limit: 6 }, { headers })
        .catch(() => null);
      // Blog/talent need feature flags from context, but must not wait for
      // jobs/companies. Chain them off boardContextP so they start as soon as
      // context resolves and overlap the rest of the fan-out.
      const blogP = boardContextP.then((boardContext) =>
        boardContext.features.blog
          ? board.blog.posts.list({ limit: 3 }, { headers }).catch(() => null)
          : null,
      );
      const talentP = boardContextP.then((boardContext) =>
        boardContext.features.talentDirectory !== 'off'
          ? readTalentDirectory(() =>
              board.talent.list({ limit: 6 }, { headers }),
            ).catch(() => null)
          : null,
      );

      const [boardContext, jobsEnvelope, companies, blog, talent] =
        await Promise.all([
          boardContextP,
          jobsListP,
          companiesP,
          blogP,
          talentP,
        ]);

      const page = {
        ...jobsEnvelope,
        data: jobsEnvelope.data.slice(0, HOME_JOB_RAIL_LIMIT),
      };
      const topCategories = (jobsEnvelope.relatedSearches ?? []).filter(
        (related): related is RelatedSearch => related.type === 'category',
      );

      const origin = new URL(getRequest().url).origin;
      const seo = {
        boardName: boardContext.name,
        language: boardContext.language,
        origin,
      };

      // Preserve home head meta EXACTLY (title/description/canonical/og).
      const title = headTitle(seo.boardName, m.home_heroHeadline());
      const description = m.home_heroSupporting();
      const canonical = selfUrl(seo.origin, '/');
      const head = {
        meta: [
          { title },
          { name: 'description', content: description },
          { property: 'og:title', content: title },
          { property: 'og:description', content: description },
          { property: 'og:type', content: 'website' },
          { property: 'og:url', content: canonical },
        ],
        links: [{ rel: 'canonical', href: canonical }],
      };

      // Same ItemList + single jobs-breadcrumb shape the body <JsonLd> built
      // (not the multi-crumb /jobs listing shape).
      const jsonLd = asJsonObjects(
        listingJsonLd({
          origin: seo.origin,
          breadcrumbs: [{ name: breadcrumbsCopy().jobs }],
          jobs: page.data,
        }),
      );

      const talentPage = talent?.status === 'available' ? talent.page : null;
      return {
        page,
        companies: companies?.data ?? [],
        companiesCount: companies?.count ?? null,
        topCategories,
        seo,
        posts: blog?.data ?? null,
        postsCount: blog?.count ?? null,
        talent: talentPage?.data ?? null,
        talentCount: talentPage?.count ?? null,
        head,
        jsonLd,
      };
    }),
  );
