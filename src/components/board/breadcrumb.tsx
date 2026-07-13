import { ChevronRight } from "@untitledui/icons";
import { Link as AriaLink } from "react-aria-components";

/**
 * The resolved trail: the ancestor crumbs (last one current/unlinked) plus the
 * `<nav aria-label>` copy. This is the ONE shape every breadcrumb-bearing
 * surface passes — the `breadcrumb` slot on `PageBody` / `ListingPageHeader`
 * and the `PageBreadcrumb` placement primitive all take it, so no route ever
 * hand-rolls the trail element or its spacing.
 */
export interface BreadcrumbData {
  items: { name: string; href?: string }[];
  ariaLabel: string;
}

/**
 * PageBreadcrumb — the ONE placement primitive for the trail (CAV-511). It
 * owns the codified position: the trail hugs the top (`pt-4 md:pt-5`, compact,
 * relative to the nav), left-aligned at the shared container edge
 * (`max-w-container` + the canonical horizontal padding). Every sanctioned
 * seam renders THIS — `PageBody`'s `breadcrumb` slot (non-band pages),
 * `ListingPageHeader`'s `breadcrumb` slot (listing heroes), and the
 * `JobDetail` header band — so the placement literally cannot diverge per
 * page. The gray-band pages seat it inside their `bg-secondary` section (the
 * band supplies the background); non-band pages render it on the page surface.
 * Identical padding classes in every context — that is the invariant the
 * pattern-contract gate enforces.
 */
export function PageBreadcrumb({ items, ariaLabel }: BreadcrumbData) {
  return (
    <div className="mx-auto w-full max-w-container px-4 pt-4 md:px-8 md:pt-5">
      <Breadcrumb items={items} ariaLabel={ariaLabel} />
    </div>
  );
}

/**
 * Breadcrumb — recomposed on the Untitled UI primitives (CAV-488), mirroring
 * the `JobDetail` breadcrumb (CAV-486): a `ChevronRight` separator, the trail
 * links riding the router seam as `AriaLink` (client-side, locale-aware nav),
 * and the current page as `aria-current` text. PURE MARKUP over the same
 * `{ items, ariaLabel }` contract. It is never rendered directly by a route —
 * the `PageBreadcrumb` placement primitive above wraps it so the trail always
 * carries the codified spacing.
 */
export function Breadcrumb({
  items,
  ariaLabel = "Breadcrumb",
}: {
  items: { name: string; href?: string }[];
  ariaLabel?: string;
}) {
  return (
    <nav aria-label={ariaLabel}>
      <ol className="flex flex-wrap items-center gap-1.5 text-sm">
        {items.map((crumb, index) => (
          <li key={`${crumb.name}-${index}`} className="flex items-center gap-1.5">
            {index > 0 ? <ChevronRight aria-hidden className="size-4 shrink-0 text-fg-quaternary" /> : null}
            {crumb.href ? (
              <AriaLink
                href={crumb.href}
                className="rounded-xs text-tertiary outline-focus-ring transition-colors hover:text-secondary hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                {crumb.name}
              </AriaLink>
            ) : (
              <span className="font-medium text-secondary" aria-current="page">
                {crumb.name}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
