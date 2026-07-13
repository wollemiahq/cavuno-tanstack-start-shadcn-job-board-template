import { JsonLd } from "@/components/json-ld";
import { Prose } from "@/components/prose";
import { PageBody } from "@/components/board/page-body";

import type { PublicLegalPage } from "@cavuno/board";
import type { BoardLabelOverrides } from "@cavuno/board/format";

import { createBreadcrumbJsonLd } from "@cavuno/board/seo";
import { boardCopy } from "#/copy";
import { legalMetaDescription, type LegalPageMeta } from "../lib/legal";

/**
 * Shared render for the legal/about surfaces. Per ADR-0039 the starter owns the
 * layout + JSON-LD; the Board API serves the portable-HTML prose (+ impressum
 * legal-entity facts).
 */
export function LegalPageView({
  page,
  origin,
  meta,
  language,
  labels,
}: {
  page: PublicLegalPage;
  origin: string;
  meta: LegalPageMeta;
  language: string;
  labels?: BoardLabelOverrides;
}) {
  const crumbs = boardCopy(language, labels).breadcrumbs;
  const url = `${origin}${meta.path}`;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": meta.jsonLdType,
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
    // Keep `PageBody` for the structural padding/width system, but constrain
    // the content column (title + prose) to a readable measure — matching the
    // blog article's center column. Long legal text at full container width is
    // an unreadable line length. `Prose`'s `max-w-none` still applies inside
    // the capped column, so the prose fills the 48rem measure.
    <PageBody>
      <div className="mx-auto w-full max-w-3xl">
        <Prose as="article">
          <JsonLd data={jsonLd} />
          <h1>{page.title}</h1>
          {page.legalEntity ? (
            <section className="not-prose mb-6 rounded-lg border border-secondary p-4 text-sm">
              {page.legalEntity.legalName ? (
                <p className="font-medium">{page.legalEntity.legalName}</p>
              ) : null}
              {page.legalEntity.address ? (
                <p className="whitespace-pre-line text-tertiary">{page.legalEntity.address}</p>
              ) : null}
            </section>
          ) : null}
          {page.content ? (
            // Prose arrives pre-sanitized from the Board API (portable HTML).
            <div dangerouslySetInnerHTML={{ __html: page.content }} />
          ) : null}
        </Prose>
      </div>
    </PageBody>
  );
}
