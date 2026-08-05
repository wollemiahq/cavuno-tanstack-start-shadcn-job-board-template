/**
 * One server boundary for the job-detail page's data and SEO payload.
 *
 * TanStack route loaders/head are isomorphic and remain in the universal
 * client entry. Importing `@cavuno/board/seo` (JobPosting JSON-LD +
 * breadcrumbs) into the route module pulls ~40 KiB of SEO builders into the
 * shared shell. Computing head meta + JSON-LD inside this handler keeps the
 * client on the server-function stub only — same pattern as getSalaryHubPage.
 *
 * Replaces the route's getJob + getSeoBase pair with a single RPC so client
 * navigation does not grow a second head-only round trip.
 */
import { createJobPostingJsonLd, listingJsonLd } from '@cavuno/board/seo';
import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';

import { getBoard } from '../lib/board';
import { boardAccessMiddleware } from '../lib/board-access-middleware';
import { headTitle } from '../lib/page-title';
import { gatedRead } from './board-access';

import { jobBreadcrumbJsonLd } from '@/lib/job-breadcrumbs';

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

export const getJobDetailPage = createServerFn({ method: 'GET' })
  .validator((input: { jobSlug: string }) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async (headers) => {
      const board = getBoard();
      const [job, boardContext] = await Promise.all([
        board.jobs.retrieve(data.jobSlug, undefined, { headers }),
        board.context(),
      ]);
      const origin = new URL(getRequest().url).origin;
      const seo = {
        boardName: boardContext.name,
        language: boardContext.language,
        origin,
      };

      const title = job.company?.name
        ? `${job.title} at ${job.company.name}`
        : job.title;
      const description = job.description
        ? job.description
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 160)
        : title;
      // Canonical points at the hosted board (the source of truth for SEO);
      // og:image is the STARTER's own /og route (self-sufficient render).
      const canonical = job.links.public;
      const ogImage =
        job.company?.slug && job.slug
          ? `${origin}/companies/${job.company.slug}/jobs/${job.slug}/og`
          : null;

      const head = {
        meta: [
          { title: headTitle(boardContext.name, title) },
          { name: 'description', content: description },
          { property: 'og:title', content: title },
          { property: 'og:description', content: description },
          { property: 'og:type', content: 'website' },
          ...(canonical ? [{ property: 'og:url', content: canonical }] : []),
          ...(ogImage
            ? [
                { property: 'og:image', content: ogImage },
                { name: 'twitter:card', content: 'summary_large_image' },
                { name: 'twitter:image', content: ogImage },
              ]
            : []),
        ],
        links: canonical ? [{ rel: 'canonical', href: canonical }] : [],
      };

      const jsonLd = asJsonObjects(
        [
          createJobPostingJsonLd({
            job,
            board: {
              name: boardContext.name,
              logoUrl: boardContext.logoUrl,
            },
            shareUrl: job.links.public ?? '',
          }),
          ...listingJsonLd({
            origin,
            breadcrumbs: jobBreadcrumbJsonLd(job),
          }),
        ].filter((entry) => entry !== null),
      );

      return { job, seo, head, jsonLd };
    }),
  );
