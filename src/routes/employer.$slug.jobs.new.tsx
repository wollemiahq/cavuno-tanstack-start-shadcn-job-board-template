import { createFileRoute, redirect } from '@tanstack/react-router';

/**
 * Alias for Stripe Checkout return/cancel URLs that land on
 * `/employer/{slug}/jobs/new`. Permanent redirect onto the real post-job page.
 */
export const Route = createFileRoute('/employer/$slug/jobs/new')({
  beforeLoad: ({ location, params }) => {
    throw redirect({
      href: `/employers/companies/${params.slug}/jobs/new${location.searchStr}`,
      statusCode: 308,
    });
  },
});
