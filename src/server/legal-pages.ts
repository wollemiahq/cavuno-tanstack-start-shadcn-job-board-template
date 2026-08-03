/**
 * Route-family-owned server boundary for the legal/about surfaces.
 *
 * Head meta + AboutPage/WebPage + breadcrumb JSON-LD are computed here so
 * route modules and LegalPageView do not import `@cavuno/board/seo` into the
 * universal client entry — same pattern as getJobDetailPage / salary-pages.
 * Folds the prior getLegalPage + getSeoBase pair into one RPC so client
 * navigation does not gain a head-only round trip.
 *
 * JSON-LD belongs in route `head()` scripts (via jsonLdHeadScripts), not in
 * the component body: body-rendered ld+json is silently lost when it lands
 * in a Suspense segment that does not flush.
 */
import type { LegalPageType } from '@cavuno/board';
import { createBreadcrumbJsonLd } from '@cavuno/board/seo';
import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';

import { getBoard } from '../lib/board';
import { boardAccessMiddleware } from '../lib/board-access-middleware';
import { LEGAL_PAGES, legalMetaDescription } from '../lib/legal';
import { headTitle } from '../lib/page-title';
import { gatedRead } from './board-access';

import { breadcrumbsCopy } from '@/copy-groups/breadcrumbs';

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

export const getLegalPageView = createServerFn({ method: 'GET' })
  .validator((input: { type: LegalPageType }) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async (headers) => {
      const board = getBoard();
      const meta = LEGAL_PAGES[data.type];
      const [page, boardContext] = await Promise.all([
        board.legal.retrieve(data.type, { headers }),
        board.context(),
      ]);
      const origin = new URL(getRequest().url).origin;
      const seo = {
        boardName: boardContext.name,
        language: boardContext.language,
        labels: boardContext.labels,
        origin,
      };

      const description = legalMetaDescription(page.content);
      const head = {
        meta: [
          {
            title: headTitle(seo.boardName, page.title),
          },
          {
            name: 'description',
            content: description,
          },
        ],
        links: [{ rel: 'canonical', href: `${seo.origin}${meta.path}` }],
      };

      const crumbs = breadcrumbsCopy(seo.language, seo.labels);
      const url = `${origin}${meta.path}`;
      const jsonLd = asJsonObjects(
        [
          {
            '@context': 'https://schema.org',
            '@type': meta.jsonLdType,
            name: page.title,
            description,
            url,
          },
          createBreadcrumbJsonLd([
            { label: crumbs.home, href: origin },
            { label: crumbs[meta.breadcrumbKey] },
          ]),
        ].filter((entry) => entry !== null),
      );

      return { page, seo, head, jsonLd };
    }),
  );
