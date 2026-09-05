import { createFileRoute, redirect } from '@tanstack/react-router';

/**
 * Alias for the Stripe Checkout SUCCESS url that lands on
 * `/employer/{slug}/jobs?checkout_success=1&job_id=…` (the platform default in
 * `lib/api-v1/employer-checkout.ts`). Sibling of the `/jobs/new` cancel alias;
 * without it a paying employer's return trip is a 404. An INDEX route, not
 * `employer.$slug.jobs.tsx`: that would become the layout parent of the
 * `/jobs/new` alias and this redirect would swallow it.
 */
export const Route = createFileRoute('/employer/$slug/jobs/')({
  beforeLoad: ({ location, params }) => {
    throw redirect({
      href: `/employers/companies/${params.slug}${location.searchStr}`,
      statusCode: 308,
    });
  },
});
