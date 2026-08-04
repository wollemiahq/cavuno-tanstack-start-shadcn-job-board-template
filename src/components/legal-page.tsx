import { boardCopy } from '#/copy';

import { createBreadcrumbJsonLd } from '@cavuno/board/seo';

import { legalMetaDescription, type LegalPageMeta } from '../lib/legal';

import { JsonLd } from '@/components/json-ld';
import { PageLayout } from '@/components/layout/page-layout';
import { Prose } from '@/components/prose';
import type { PublicLegalPage } from '@cavuno/board';

/**
 * Shared render for the legal/about surfaces. The starter owns the layout and
 * JSON-LD; the Board API serves the portable-HTML prose (+ impressum
 * legal-entity facts).
 */
export function LegalPageView({
  page,
  origin,
  meta,
  language,
}: {
  page: PublicLegalPage;
  origin: string;
  meta: LegalPageMeta;
  language: string;
}) {
  const crumbs = boardCopy(language).breadcrumbs;
  const url = `${origin}${meta.path}`;
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': meta.jsonLdType,
      name: page.title,
      description: legalMetaDescription(page.content),
      url,
    },
    createBreadcrumbJsonLd([
      { label: crumbs.home, href: origin },
      { label: crumbs[meta.breadcrumbKey] },
    ]),
  ].filter((e): e is Record<string, unknown> => e !== null);

  return (
    // Keep the shared page geometry, but constrain
    // the content column (title + prose) to a readable measure — matching the
    // blog article's center column. Long legal text at full container width is
    // an unreadable line length. `Prose`'s `max-w-none` still applies inside
    // the capped column, so the prose fills the 48rem measure.
    <PageLayout>
      <div className="mx-auto w-full max-w-3xl">
        {/* `dir` is pinned off `auto` on the wrapper on purpose: the JSON-LD
            <script> below is a text-node descendant, so first-strong would
            resolve against `{"@context":"https://…` rather than the prose.
            Each real content field carries its own `dir="auto"` instead. */}
        <Prose as="article" dir={undefined}>
          <JsonLd data={jsonLd} />
          <h1 dir="auto">{page.title}</h1>
          {page.legalEntity ? (
            <section className="not-typeset border-border mb-6 rounded-lg border p-4 text-sm">
              {page.legalEntity.legalName ? (
                <p className="font-medium" dir="auto">
                  {page.legalEntity.legalName}
                </p>
              ) : null}
              {page.legalEntity.address ? (
                <p
                  className="text-muted-foreground whitespace-pre-line"
                  dir="auto"
                >
                  {page.legalEntity.address}
                </p>
              ) : null}
            </section>
          ) : null}
          {page.content ? (
            // Prose arrives pre-sanitized from the Board API (portable HTML).
            <div
              dir="auto"
              dangerouslySetInnerHTML={{ __html: page.content }}
            />
          ) : null}
        </Prose>
      </div>
    </PageLayout>
  );
}
