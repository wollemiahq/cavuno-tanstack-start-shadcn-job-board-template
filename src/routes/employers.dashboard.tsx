import { useCallback } from 'react';

import { Link, createFileRoute, useRouter } from '@tanstack/react-router';

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
import type { UrlSearchInput } from '@/lib/pagination';

export const Route = createFileRoute('/employers/dashboard')({
  validateSearch: (
    search: UrlSearchInput,
  ): { add?: boolean; verified?: WorkEmailVerificationOutcome } => {
    const verified =
      search.verified === 'approved' ||
      search.verified === 'pending' ||
      search.verified === 'invalid'
        ? search.verified
        : undefined;
    return {
      ...(search.add === true || search.add === 'true' ? { add: true } : {}),
      ...(verified ? { verified } : {}),
    };
  },
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
  const { add, verified } = Route.useSearch();
  const router = useRouter();
  const consumeVerificationOutcome = useCallback(() => {
    void router.navigate({
      to: '/employers/dashboard',
      search: add ? { add: true } : {},
      replace: true,
      resetScroll: false,
    });
  }, [add, router]);
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
        invalidate: () => router.invalidate(),
        navigateToOnboarding: (slug) =>
          router.navigate({
            to: '/employers/onboarding/$slug',
            params: { slug },
          }),
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
