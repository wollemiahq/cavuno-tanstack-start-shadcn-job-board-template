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
} from './-employers.dashboard';

import { headTitle } from '@/lib/page-title';
import type { UrlSearchInput } from '@/lib/pagination';

export const Route = createFileRoute('/employers/dashboard')({
  validateSearch: (search: UrlSearchInput): { add?: boolean } =>
    search.add === true || search.add === 'true' ? { add: true } : {},
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
  const { add } = Route.useSearch();
  const router = useRouter();
  return (
    <EmployerDashboardView
      companies={companies.data}
      add={add}
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
