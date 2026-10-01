import { createFileRoute, redirect } from '@tanstack/react-router';

/**
 * Alias for Cavuno new-application emails that link
 * `/employer/{slug}/jobs/{jobId}/applicants`. Permanent redirect onto the
 * real applicant pipeline.
 */
export const Route = createFileRoute('/employer/$slug/jobs/$jobId/applicants')({
  beforeLoad: ({ location, params }) => {
    throw redirect({
      href: `/employers/companies/${params.slug}/jobs/${params.jobId}/applicants${location.searchStr}`,
      statusCode: 308,
    });
  },
});
