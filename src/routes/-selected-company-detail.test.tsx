// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { formatSalaryStatRange } from '@cavuno/board/format';
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SelectedCompanyDetail } from './-selected-company-detail';

import type { PublicCompanyDetail, PublicJobCard } from '@cavuno/board';

const company = {
  id: 'company-1',
  object: 'public_company',
  slug: 'acme',
  name: 'Acme',
  logoUrl: null,
  website: 'https://acme.example',
  description: '<p>Builds rockets.</p>',
  jobCount: 3,
  publishedJobCount: 3,
  markets: [{ slug: 'technology', name: 'Technology' }],
  links: { public: 'https://jobs.example/companies/acme' },
} as PublicCompanyDetail;

const jobs = {
  object: 'list' as const,
  url: '/companies/acme/jobs',
  data: Array.from({ length: 5 }, (_, index) => ({
    id: `job-${index + 1}`,
    slug: `role-${index + 1}`,
    title: `Role ${index + 1}`,
    description: '<p>Build useful tools.</p>',
    publishedAt: null,
    employmentType: 'full_time',
    remoteOption: 'hybrid',
    remoteLocationLabel: null,
    locationLabel: 'Sydney',
    salaryMin: 180_000,
    salaryMax: 240_000,
    salaryCurrency: 'USD',
    salaryTimeframe: 'year',
    isFeatured: false,
    company: { slug: 'acme', name: 'Acme', logoUrl: null },
    categories: [{ slug: 'engineering', name: 'Engineering' }],
    skills: [],
  })) as unknown as PublicJobCard[],
  hasMore: false,
  nextCursor: null,
};

const salarySummary = {
  overallSalary: { avgMin: 180_000, avgMax: 240_000, jobCount: 12 },
  byCategory: [],
  currency: 'USD',
};

afterEach(cleanup);

function renderSelectedCompany(
  state: Parameters<typeof SelectedCompanyDetail>[0]['state'],
) {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <SelectedCompanyDetail state={state} language="en" />,
  });
  const companyJobsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/companies/$companySlug/jobs',
    component: () => <p>Company jobs</p>,
  });
  const companySalariesRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/companies/$companySlug/salaries',
    component: () => <p>Company salaries</p>,
  });
  const companyJobRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/companies/$companySlug/jobs/$jobSlug',
    component: () => <p>Job detail</p>,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([
      indexRoute,
      companyJobsRoute,
      companySalariesRoute,
      companyJobRoute,
    ]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });

  return render(<RouterProvider router={router} />);
}

describe('SelectedCompanyDetail', () => {
  it('renders decision-complete actions only when the selected company is ready', async () => {
    const loading = renderSelectedCompany({
      status: 'loading',
      company,
      jobs,
      salarySummary,
      retry: vi.fn(),
    });

    expect(await screen.findByRole('status')).toHaveAttribute(
      'aria-busy',
      'true',
    );
    expect(screen.queryByText('Acme')).toBeNull();
    expect(screen.queryByText('Builds rockets.')).toBeNull();
    expect(
      screen.queryByRole('link', { name: 'View company' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'View jobs' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'View salaries' }),
    ).not.toBeInTheDocument();

    loading.unmount();
    renderSelectedCompany({
      status: 'ready',
      company,
      jobs,
      salarySummary,
      retry: vi.fn(),
    });

    expect(screen.queryByRole('link', { name: 'View company' })).toBeNull();
    expect(
      await screen.findByRole('link', { name: 'View jobs' }),
    ).toHaveAttribute('href', '/companies/acme/jobs');
    expect(screen.getAllByRole('link', { name: 'View salaries' })).toHaveLength(
      2,
    );
    expect(screen.getByRole('link', { name: 'View all jobs' })).toHaveAttribute(
      'href',
      '/companies/acme/jobs',
    );
    expect(screen.queryByRole('link', { name: 'Visit website' })).toBeNull();
    expect(screen.getByRole('link', { name: 'acme.example' })).toHaveAttribute(
      'href',
      'https://acme.example',
    );
    expect(screen.getByRole('link', { name: 'Role 1' })).toHaveAttribute(
      'href',
      '/companies/acme/jobs/role-1',
    );
    expect(screen.getByRole('link', { name: 'Role 4' })).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Role 5' })).toBeNull();
    // Delegation-style: wire data runs the REAL mapper, so the expectation
    // calls the same SDK formatter instead of pinning its output shape.
    expect(
      screen.getByText(formatSalaryStatRange('en', 180_000, 240_000, 'USD')!),
    ).toBeVisible();
    expect(screen.getByText('Based on 12 jobs')).toBeVisible();
  });

  it('uses real category salary data when an overall salary is unavailable', async () => {
    renderSelectedCompany({
      status: 'ready',
      company,
      jobs: { ...jobs, data: [] },
      salarySummary: {
        overallSalary: null,
        byCategory: [
          {
            categorySlug: 'engineering',
            categoryName: 'Engineering',
            avgSalaryMin: 120_000,
            avgSalaryMax: 160_000,
            jobCount: 5,
          },
        ],
        currency: 'USD',
      },
      retry: vi.fn(),
    });

    expect(
      await screen.findAllByRole('link', { name: 'View salaries' }),
    ).toHaveLength(2);
    expect(screen.queryByRole('link', { name: 'View jobs' })).toBeNull();
    expect(screen.getByText('Engineering')).toBeVisible();
    expect(
      screen.getByText(formatSalaryStatRange('en', 120_000, 160_000, 'USD')!),
    ).toBeVisible();
    expect(screen.getByText('Based on 5 jobs')).toBeVisible();
  });
});
