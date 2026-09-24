import { useCallback } from 'react';

import {
  Link,
  createFileRoute,
  getRouteApi,
  useRouter,
} from '@tanstack/react-router';

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

import { boardForms } from '@/board/form-layout';
import { headTitle } from '@/lib/page-title';
import type { UrlSearchInput } from '@/lib/pagination';

export interface EmployerDashboardSearch {
  add?: boolean;
  verified?: WorkEmailVerificationOutcome;
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

const rootApi = getRouteApi('__root__');

function EmployerDashboard() {
  const companies = Route.useLoaderData();
  const { board } = rootApi.useLoaderData();
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
      companyFormLayout={boardForms(board)?.company ?? null}
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
