import { useCallback } from 'react';

import { Link, createFileRoute, useRouter } from '@tanstack/react-router';

import { useRootSession } from '../components/root-session';
import { employerReturnTo } from '../lib/employer-return-to';
import { m } from '../paraglide/messages';
import {
  claimCompany,
  createCompany,
  searchCompanies,
} from '../server/employers';
import {
  EmployerDashboardView,
  createEmployerDashboardLoader,
  type WorkEmailVerificationOutcome,
} from './-employers.dashboard';

import { headTitle } from '@/lib/page-title';
import { searchString, type UrlSearchInput } from '@/lib/pagination';

export interface EmployerDashboardSearch {
  add?: boolean;
  verified?: WorkEmailVerificationOutcome;
  /** Where to continue once a new company is approved, such as `/post`. */
  returnTo?: string;
}

export function validateEmployerDashboardSearch(
  search: UrlSearchInput,
): EmployerDashboardSearch {
  const result: EmployerDashboardSearch = {};
  if (search.add === true || search.add === 'true') result.add = true;
  if (
    search.verified === 'approved' ||
    search.verified === 'pending' ||
    search.verified === 'invalid'
  ) {
    result.verified = search.verified;
  }
  const returnTo = employerReturnTo(searchString(search.returnTo));
  if (returnTo) result.returnTo = returnTo;
  return result;
}

export const Route = createFileRoute('/employers/dashboard')({
  validateSearch: validateEmployerDashboardSearch,
  loader: createEmployerDashboardLoader(),
  head: ({ loaderData }) => ({
    meta: [
      {
        title: headTitle(
          loaderData?.seo.boardName,
          m.employerDashboard_metaTitle(),
        ),
      },
    ],
  }),
  staticData: { ownsMain: true },
  component: EmployerDashboard,
});

function EmployerDashboard() {
  const companies = Route.useLoaderData();
  const { add, verified, returnTo } = Route.useSearch();
  const router = useRouter();
  const { refreshSession } = useRootSession();
  const consumeVerificationOutcome = useCallback(() => {
    // Drops only the one-shot outcome; the employer keeps where they go next.
    const search: EmployerDashboardSearch = {};
    if (add) search.add = true;
    if (returnTo) search.returnTo = returnTo;
    void router.navigate({
      to: '/employers/dashboard',
      search,
      replace: true,
      resetScroll: false,
    });
  }, [add, returnTo, router]);
  return (
    <EmployerDashboardView
      companies={companies.data}
      add={add}
      verified={verified}
      consumeVerificationOutcome={consumeVerificationOutcome}
      dependencies={{
        searchCompanies,
        claimCompany,
        createCompany,
        invalidate: async () => {
          await Promise.all([router.invalidate(), refreshSession()]);
        },
        navigateToOnboarding: (slug) =>
          router.navigate({
            to: '/employers/onboarding/$slug',
            params: { slug },
          }),
        continueWithCompany: returnTo
          ? () => router.navigate({ href: returnTo })
          : undefined,
        companyRouteElement: ({ approved, slug }) => (
          <Link
            to={
              approved
                ? '/employers/companies/$slug'
                : '/employers/onboarding/$slug'
            }
            params={{ slug }}
          />
        ),
      }}
    />
  );
}
