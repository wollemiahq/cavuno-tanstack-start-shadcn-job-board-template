import { createFileRoute, redirect } from '@tanstack/react-router';

import { confirmWorkEmail } from '../server/employers';

/**
 * Work-email verification landing — the target of the link the API emails when
 * an employer verifies a company work email. The token IS the authorization
 * (no session needed). Consumes it via `confirmWorkEmail`, then redirects to
 * the dashboard with the outcome — `approved` on a domain match, else
 * `pending` (awaiting board-owner approval). Mirrors the hosted
 * `/auth/verify-work-email` GET route.
 */
export const Route = createFileRoute('/auth/verify-work-email')({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === 'string' ? search.token : '',
    slug: typeof search.slug === 'string' ? search.slug : '',
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    if (!deps.token || !deps.slug) {
      throw redirect({ href: '/employers/dashboard?verified=invalid' });
    }
    const result = await confirmWorkEmail({
      data: { slug: deps.slug, body: { token: deps.token } },
    });
    if (!result.ok) {
      throw redirect({ href: '/employers/dashboard?verified=invalid' });
    }
    const outcome = result.data.status === 'approved' ? 'approved' : 'pending';
    throw redirect({ href: `/employers/dashboard?verified=${outcome}` });
  },
});
