import { PageLayout } from '@/components/layout/page-layout';
import { Prose } from '@/components/prose';
import { LEGAL_CONTENT } from '@/content/legal';
import type { LegalPageViewModel } from '@/lib/legal';

/**
 * Shared render for the legal/about surfaces. The starter owns the layout and
 * the prose (`src/content/legal/`). Head meta + JSON-LD are computed in
 * `getLegalPageView` and emitted via route `head()` scripts — not here.
 *
 * Bodies are real React elements from the content module — not HTML strings —
 * so this view never uses `dangerouslySetInnerHTML` (a security simplification
 * vs. pre-sanitized API portable HTML).
 */
export function LegalPageView({ page }: { page: LegalPageViewModel }) {
  const { Body } = LEGAL_CONTENT[page.type];

  return (
    // Keep the shared page geometry, but constrain
    // the content column (title + prose) to a readable measure — matching the
    // blog article's center column. Long legal text at full container width is
    // an unreadable line length. `Prose`'s `max-w-none` still applies inside
    // the capped column, so the prose fills the 48rem measure.
    <PageLayout>
      <div className="mx-auto w-full max-w-3xl">
        {/* `dir` is pinned off `auto` on the wrapper for a stable article
            base direction; each real content field carries its own
            `dir="auto"` instead so first-strong resolves against prose, not
            surrounding chrome. */}
        <Prose as="article" dir={undefined}>
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
          <div dir="auto">
            <Body />
          </div>
        </Prose>
      </div>
    </PageLayout>
  );
}
