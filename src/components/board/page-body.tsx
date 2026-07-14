import { PageBreadcrumb } from '@/components/board/breadcrumb';
import type { BreadcrumbData } from '@/components/board/breadcrumb';

/**
 * Migration-only compatibility shell for routes that predate the canonical
 * `Page` / `PageHeader` / `PageContent` / `PageSection` family. Do not use
 * `PageBody` for new page-level composition; migrate existing consumers to
 * the Page family as those routes are touched.
 *
 * Preserved public slots:
 *  - `band` — a full-bleed section rendered edge-to-edge ABOVE the
 *    constrained container (the Lumen gray listing header, the job-detail
 *    header band). The band owns its own inner `max-w-7xl` wrapper and,
 *    when it has one, its OWN breadcrumb (via `ListingPageHeader` / the
 *    `JobDetail` band) — so `breadcrumb` below is for the band-less pages.
 *  - `breadcrumb` — the resolved trail for a NON-band page (a company
 *    profile, a blog article, a salary page). `PageBody` seats it through the
 *    shared `PageBreadcrumb` placement primitive, hugging the nav at the
 *    codified `pt-4 md:pt-5`, so the spacing is identical to the band pages'.
 *  - `children` — the constrained content, on the shared container
 *    width + padding + `gap-8` rhythm.
 *  - `rail` — an optional right-hand sticky column; when present the body
 *    becomes the two-column `[1fr_20rem]` grid (the job-detail
 *    apply-rail pattern). On mobile the rail stacks above the content.
 */
export function PageBody({
  band,
  breadcrumb,
  rail,
  children,
}: {
  /** Full-bleed section rendered above the constrained container. */
  band?: React.ReactNode;
  /** Resolved trail for a band-less page — rendered via `PageBreadcrumb`. */
  breadcrumb?: BreadcrumbData;
  /** Optional sticky right rail — switches the body to the two-column grid. */
  rail?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <>
      {band}
      {breadcrumb ? (
        <PageBreadcrumb
          items={breadcrumb.items}
          ariaLabel={breadcrumb.ariaLabel}
        />
      ) : null}
      <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8 md:py-10">
        {rail ? (
          <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
            {/* Main content spans both rows on desktop so the rail
                            and anything under it stack alongside it. */}
            <div className="flex min-w-0 flex-col gap-8 lg:col-start-1 lg:row-span-2 lg:row-start-1">
              {children}
            </div>
            {/* Sticky rail — right column on desktop, first on mobile. */}
            <aside className="flex flex-col gap-6 lg:sticky lg:top-8 lg:col-start-2 lg:row-start-1 lg:self-start">
              {rail}
            </aside>
          </div>
        ) : (
          <div className="flex flex-col gap-8">{children}</div>
        )}
      </div>
    </>
  );
}
