import { createFileRoute, redirect } from '@tanstack/react-router';

import { confirmWorkEmail } from '../server/employers';

import { searchString, type UrlSearchInput } from '@/lib/pagination';

/**
 * Work-email verification landing — the target of the link the API emails when
 * an employer verifies a company work email. The token IS the authorization
 * (no session needed) and the whole binding: it carries the board user and the
 * work email, which is all the server needs to find the pending claim.
 * Consumes it via `confirmWorkEmail`, then redirects to the dashboard with the
 * outcome — `approved` on a domain match, else `pending` (awaiting board-owner
 * approval). Mirrors the hosted `/auth/verify-work-email` GET route.
 *
 * The same link can finish a company website change. Then the employer goes
 * back to that company's profile with how it ended; the profile route sends
 * anyone who is not a member of it to the dashboard.
 *
 * A company slug is deliberately NOT required. This route used to demand one
 * and bail to `verified=invalid` without it — but the emailed link has only a
 * token, so every click failed on the first try looking exactly like an
 * expired link. Any `?slug=` still on an in-flight link is ignored.
 */
export const Route = createFileRoute('/auth/verify-work-email')({
  validateSearch: (search: UrlSearchInput) => ({
    token: searchString(search.token) ?? '',
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    if (!deps.token) {
      throw redirect({ href: '/employers/dashboard?verified=invalid' });
    }
    const result = await confirmWorkEmail({
      data: { body: { token: deps.token } },
    });
    if (!result.ok) {
      throw redirect({ href: '/employers/dashboard?verified=invalid' });
    }
    const change = result.data.websiteChange;
    const slug = result.data.company.slug;
    if (change && slug) {
      throw redirect({
        to: '/employers/companies/$slug/profile',
        params: { slug },
        search: { website: change.outcome },
      });
    }
    const outcome = result.data.status === 'approved' ? 'approved' : 'pending';
    throw redirect({ href: `/employers/dashboard?verified=${outcome}` });
  },
});
