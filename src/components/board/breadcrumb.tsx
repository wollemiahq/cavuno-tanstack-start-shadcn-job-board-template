import { Fragment } from 'react';

import { Link } from '@tanstack/react-router';

import { Box } from '@/components/layout/box';
import {
  Breadcrumb as BreadcrumbRoot,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

/**
 * The resolved trail: the ancestor crumbs (last one current/unlinked) plus the
 * `<nav aria-label>` copy. This is the ONE shape every breadcrumb-bearing
 * surface passes. The root shell is the sole visible placement owner.
 */
export interface BreadcrumbData {
  items: { name: string; href?: string }[];
  ariaLabel: string;
}

/** The one visible trail placement: the compact first row of the footer. */
export function ShellBreadcrumb({ items, ariaLabel }: BreadcrumbData) {
  return (
    <div data-slot="shell-breadcrumb">
      <Box border="bottom" paddingY={{ base: '4', md: '5' }}>
        <Breadcrumb items={items} ariaLabel={ariaLabel} />
      </Box>
    </div>
  );
}

/**
 * Breadcrumb — composed from the owned shadcn primitives: a `ChevronRight`
 * separator, trail links riding the TanStack router seam (client-side,
 * locale-aware navigation), and the current page as `aria-current` text. Pure
 * markup over the same
 * `{ items, ariaLabel }` contract. It is never rendered directly by a route —
 * `ShellBreadcrumb` above wraps it so the trail always carries the codified
 * spacing immediately before the footer.
 */
export function Breadcrumb({
  items,
  ariaLabel = 'Breadcrumb',
}: {
  items: { name: string; href?: string }[];
  ariaLabel?: string;
}) {
  return (
    <BreadcrumbRoot aria-label={ariaLabel}>
      <BreadcrumbList>
        {items.map((crumb, index) => (
          <Fragment key={`${crumb.name}-${index}`}>
            {index > 0 ? <BreadcrumbSeparator /> : null}
            <BreadcrumbItem>
              {crumb.href ? (
                <BreadcrumbLink
                  render={<Link to={crumb.href} />}
                  className="outline-ring rounded-xs hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  {crumb.name}
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{crumb.name}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </BreadcrumbRoot>
  );
}
