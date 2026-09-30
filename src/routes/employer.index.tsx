import { createFileRoute, redirect } from '@tanstack/react-router';

/**
 * Alias for Cavuno company-access approval emails that link `/employer`.
 * Permanent redirect onto the real employer dashboard.
 */
export const Route = createFileRoute('/employer/')({
  beforeLoad: ({ location }) => {
    throw redirect({
      href: `/employers/dashboard${location.searchStr}`,
      statusCode: 308,
    });
  },
});
