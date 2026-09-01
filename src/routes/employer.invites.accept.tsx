import { createFileRoute, redirect } from '@tanstack/react-router';

/**
 * Alias for Cavuno invite emails that link `/employer/invites/accept`.
 * Permanent redirect onto the real accept route; token stays in the query.
 */
export const Route = createFileRoute('/employer/invites/accept')({
  beforeLoad: ({ location }) => {
    throw redirect({
      href: `/employers/invites/accept${location.searchStr}`,
      statusCode: 308,
    });
  },
});
