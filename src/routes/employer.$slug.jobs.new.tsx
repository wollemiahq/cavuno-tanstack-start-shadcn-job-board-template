import { createFileRoute, redirect } from '@tanstack/react-router';

import { employerSingularAliasHref } from '../lib/employer-singular-alias';

/**
 * Alias for Stripe Checkout return/cancel URLs that land on
 * `/employer/{slug}/jobs/new`. Permanent redirect onto the real post-job page.
 */
export const Route = createFileRoute('/employer/$slug/jobs/new')({
  beforeLoad: ({ location }) => {
    const href = employerSingularAliasHref(
      location.pathname,
      location.searchStr,
    );
    if (!href) {
      throw redirect({ href: '/employers/dashboard', statusCode: 308 });
    }
    throw redirect({ href, statusCode: 308 });
  },
});
