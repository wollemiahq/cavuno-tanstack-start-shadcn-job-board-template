import { createBreadcrumbJsonLd } from '@cavuno/board/seo';
import { notFound } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';

import { resolveLegalContent, resolveLegalEntity } from '../content/legal';
import { impressumHasContent } from '../content/legal/impressum-availability';
import { renderLegalHtml, renderLegalText } from '../content/legal/render';
import { boardAccessMiddleware } from '../lib/board-access-middleware';
import { readBoardContext } from '../lib/board-context-cache';
import { LEGAL_PAGES, type LegalPageViewModel } from '../lib/legal';
import { headTitle } from '../lib/page-title';
import { readPublicOrigin } from '../lib/public-origin';
import { gatedRead } from './board-access';

import { breadcrumbsCopy } from '@/copy-groups/breadcrumbs';
/**
 * Route-family-owned server boundary for the legal/about surfaces.
 *
 * Prose is application-owned (`src/content/legal/`) — this function no longer
 * calls `board.legal.retrieve`. It still reads board context for name /
 * language. Every page 404s here until it has content; the prose is local,
 * so nothing else 404s an unwritten Impressum. It also builds head meta +
 * AboutPage/WebPage + breadcrumb JSON-LD so route modules and LegalPageView
 * do not import `@cavuno/board/seo` into the universal client entry.
 *
 * JSON-LD belongs in route `head()` scripts (via jsonLdHeadScripts), not in
 * the component body: body-rendered ld+json is silently lost when it lands
 * in a Suspense segment that does not flush.
 */
import type { LegalPageType } from '@/lib/legal';
import { selfUrl } from '@/lib/self-url';

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

export const getLegalPageView = createServerFn({ method: 'GET' })
  .validator((input: { type: LegalPageType }) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async () => {
      const meta = LEGAL_PAGES[data.type];
      const boardContext = await readBoardContext();

      // The Impressum is published once the operator has written it, in
      // any language (`impressumHasContent`, the rule the footer link,
      // sitemap and well-known manifest share). Checked before the origin
      // read and metadata so an unwritten one 404s cheaply.
      if (data.type === 'impressum' && !impressumHasContent()) {
        throw notFound();
      }
      // A page with no content in any language is not published.
      const content = resolveLegalContent(data.type);
      if (content === null) throw notFound();

      const origin = await readPublicOrigin();
      const seo = {
        boardName: boardContext.name,
        language: boardContext.language,
        origin,
      };

      const title = renderLegalText(content.title, seo.boardName);
      const description = renderLegalText(content.description, seo.boardName);
      const head = {
        meta: [
          {
            title: headTitle(seo.boardName, title),
          },
          {
            name: 'description',
            content: description,
          },
        ],
        links: [{ rel: 'canonical', href: selfUrl(seo.origin, meta.path) }],
      };

      const crumbs = breadcrumbsCopy();
      const url = selfUrl(origin, meta.path);
      const jsonLd = asJsonObjects(
        [
          {
            '@context': 'https://schema.org',
            '@type': meta.jsonLdType,
            name: title,
            description,
            url,
          },
          createBreadcrumbJsonLd([
            { label: crumbs.home, href: selfUrl(origin, '/') },
            { label: crumbs[meta.breadcrumbKey] },
          ]),
        ].filter((entry) => entry !== null),
      );

      const page: LegalPageViewModel = {
        type: data.type,
        title,
        html: renderLegalHtml(content.html, seo.boardName),
        legalEntity:
          data.type === 'impressum'
            ? resolveLegalEntity(boardContext.contact?.legalName)
            : null,
      };

      return { page, seo, head, jsonLd };
    }),
  );
