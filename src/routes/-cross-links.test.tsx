// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
  type RouteComponent,
} from '@tanstack/react-router';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

type MockRouteOptions = Parameters<
  ReturnType<typeof import('@tanstack/react-router').createFileRoute>
>[0];
// The pages read only the loader fields each test sets.
const loader = vi.hoisted(() => ({ data: {} }));
vi.mock('@tanstack/react-router', async (original) => {
  const actual = await original<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    createFileRoute: () => (options: MockRouteOptions) => ({
      options,
      useLoaderData: () => loader.data,
    }),
  };
});

import { m } from '../paraglide/messages';
import { Route as CompanyCategorySalaryRoute } from './companies.$companySlug.salaries.$categorySlug';
import { Route as TitleSalaryRoute } from './salaries.titles.$slug.index';

import type { JobDetailCompanyVM } from '@/board/job-detail-view-model';
import { JobAboutCompanyCard } from '@/components/board/job-about-company-card';

async function renderPage(Page: RouteComponent) {
  const rootRoute = createRootRoute({ component: Page });
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  render(<RouterProvider router={router} />);
  await router.load();
}

function hrefOf(name: string) {
  return screen.getByRole('link', { name }).getAttribute('href');
}

afterEach(() => {
  cleanup();
});

const company: JobDetailCompanyVM = {
  name: 'Fixture company',
  logoUrl: null,
  websiteHref: null,
  websiteLabel: null,
  slug: 'fixture-company',
  href: '/companies/fixture-company',
  intro: null,
  viewProfileLabel: m.jobDetail_viewCompanyProfileLabel(),
  membershipPlanName: null,
};

describe('job detail company card', () => {
  it("links the company's jobs page, and its salaries only when indexable", async () => {
    await renderPage(() => <JobAboutCompanyCard company={company} />);

    expect(
      hrefOf(m.jobDetail_companyJobsLink({ company: company.name! })),
    ).toBe('/companies/fixture-company/jobs');
    expect(
      screen.queryByRole('link', {
        name: m.jobDetail_companySalariesLink({ company: company.name! }),
      }),
    ).not.toBeInTheDocument();

    cleanup();
    await renderPage(() => (
      <JobAboutCompanyCard company={company} salariesLinked />
    ));
    expect(
      hrefOf(m.jobDetail_companySalariesLink({ company: company.name! })),
    ).toBe('/companies/fixture-company/salaries');
  });
});

function companyCategoryData(roleSalarySlug: string | null) {
  return {
    salary: {
      companySlug: 'fixture-company',
      companyName: 'Fixture company',
      categoryCanonicalSlug: 'fixture-role',
      categoryName: 'Fixture role',
      currency: 'USD',
      overallSalary: null,
      bySeniority: [],
      competitors: [],
    },
    faqs: [],
    roleSalarySlug,
    roleJobsSlug: 'fixture-role',
  };
}

describe('company role salary page links', () => {
  const roleSalaries = () =>
    m.companySalaries_roleSalariesLink({ category: 'Fixture role' });

  it("links the company's jobs and the role's jobs, empty state included", async () => {
    loader.data = companyCategoryData(null);
    await renderPage(CompanyCategorySalaryRoute.options.component!);

    expect(
      hrefOf(m.companySalaries_companyJobsLink({ company: 'Fixture company' })),
    ).toBe('/companies/fixture-company/jobs');
    expect(hrefOf(m.salaryDetail_roleJobsLink({ title: 'Fixture role' }))).toBe(
      '/jobs/fixture-role',
    );
  });

  it('links the role salary page only when the API marks it indexable', async () => {
    loader.data = companyCategoryData(null);
    await renderPage(CompanyCategorySalaryRoute.options.component!);
    expect(
      screen.queryByRole('link', { name: roleSalaries() }),
    ).not.toBeInTheDocument();

    cleanup();
    loader.data = companyCategoryData('fixture-role');
    await renderPage(CompanyCategorySalaryRoute.options.component!);
    expect(hrefOf(roleSalaries())).toBe('/salaries/titles/fixture-role');
  });
});

describe('salary title page jobs link', () => {
  const roleJobs = () => m.salaryDetail_roleJobsLink({ title: 'Fixture role' });
  const titleData = (roleJobsSlug: string | null) => ({
    salary: {
      canonicalSlug: 'fixture-role',
      categoryName: 'Fixture role',
      currency: 'USD',
      overallSalary: null,
      bySeniority: [],
      topCompanies: [],
      topLocations: [],
      topSkills: [],
      relatedTitles: [],
    },
    faqs: [],
    roleJobsSlug,
  });

  it('links the jobs category the role resolves to', async () => {
    loader.data = titleData('fixture-role-canonical');
    await renderPage(TitleSalaryRoute.options.component!);
    expect(hrefOf(roleJobs())).toBe('/jobs/fixture-role-canonical');
  });

  it('shows no jobs link when the role has no jobs category', async () => {
    loader.data = titleData(null);
    await renderPage(TitleSalaryRoute.options.component!);
    expect(
      screen.queryByRole('link', { name: roleJobs() }),
    ).not.toBeInTheDocument();
  });
});
