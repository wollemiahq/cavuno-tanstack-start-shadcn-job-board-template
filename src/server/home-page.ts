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
import { headTitle } from '../lib/page-title';
import { m } from '../paraglide/messages';
import { gatedRead } from './board-access';
import { readTalentDirectory } from './talent-directory-read';

import { breadcrumbsCopy } from '@/copy-groups/breadcrumbs';
import type { RelatedSearch } from '@cavuno/board';

/**
 * JSON-LD is schema.org-shaped nested objects. TanStack Start's server-fn
 * serializer rejects `Record<string, unknown>` (`unknown` is not serializable),
 * so we reify the builders' output as a plain JSON value tree.
 */
type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
type JsonObject = { [key: string]: JsonValue };

function asJsonObjects(value: unknown): JsonObject[] {
  return JSON.parse(JSON.stringify(value)) as JsonObject[];
}

export const getHomePage = createServerFn({ method: 'GET' })
  .middleware([boardAccessMiddleware])
  .handler(({ context }) =>
    gatedRead(context, async (headers) => {
      const board = getBoard();
      // Board context is an OPEN read (password wall does not gate it),
      // matching getSeoBase / getJobDetailPage. Content reads use headers.
      const boardContextP = board.context();
      const jobsP = board.jobs.list(
        { limit: 8, fields: '+description' },
        { headers },
      );
      // Additive companies strip — fail soft so a rejecting preview never
      // faults the whole landing.
      const companiesP = board.companies
        .list({ limit: 6 }, { headers })
        .catch(() => null);
      // Board-wide top categories by live job count — same full-page facet
      // read as listTopJobCategories (limit: 1 yields no facets).
      const topCategoriesP = board.jobs
        .list({ limit: 20 }, { headers })
        .then((envelope) =>
          (envelope.relatedSearches ?? []).filter(
            (related): related is RelatedSearch => related.type === 'category',
          ),
        )
        .catch(() => [] as RelatedSearch[]);

      const boardContext = await boardContextP;
      const origin = new URL(getRequest().url).origin;
      const seo = {
        boardName: boardContext.name,
        language: boardContext.language,
        origin,
      };

      const [page, companies, topCategories, blog, talent] = await Promise.all([
        jobsP,
        companiesP,
        topCategoriesP,
        // Blog preview — only when the board runs a blog.
        boardContext.features.blog
          ? board.blog.posts.list({ limit: 3 }, { headers }).catch(() => null)
          : Promise.resolve(null),
        // Talent preview — only when the directory feature is on. The
        // serialised restricted result omits the preview for anonymous home
        // visitors.
        boardContext.features.talentDirectory !== 'off'
          ? readTalentDirectory(() =>
              board.talent.list({ limit: 6 }, { headers }),
            ).catch(() => null)
          : Promise.resolve(null),
      ]);

      // Preserve home head meta EXACTLY (title/description/canonical/og).
      const title = headTitle(seo.boardName, m.home_heroHeadline());
      const description = m.home_heroSupporting();
      const canonical = `${seo.origin}/`;
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
          breadcrumbs: [
            { name: breadcrumbsCopy(seo.language).jobs },
          ],
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
