import { createFileRoute, redirect } from '@tanstack/react-router';

import { employerSingularAliasHref } from '../lib/employer-singular-alias';

/**
 * Alias for Cavuno invite emails that link `/employer/invites/accept`.
 * Permanent redirect onto the real accept route; token stays in the query.
 */
export const Route = createFileRoute('/employer/invites/accept')({
  beforeLoad: ({ location }) => {
    const href = employerSingularAliasHref(
      location.pathname,
      location.searchStr,
    );
    if (!href) {
      throw redirect({ href: '/employers/invites/accept', statusCode: 308 });
    }
    throw redirect({ href, statusCode: 308 });
  },
});
