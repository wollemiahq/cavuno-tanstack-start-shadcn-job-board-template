// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
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

import type { PublicCompanyDetail } from '@cavuno/board';

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

afterEach(cleanup);

function renderSelectedCompany(
  state: Parameters<typeof SelectedCompanyDetail>[0]['state'],
) {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <SelectedCompanyDetail state={state} />,
  });
  const companyJobsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/companies/$companySlug/jobs',
    component: () => <p>Company jobs</p>,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, companyJobsRoute]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });

  return render(<RouterProvider router={router} />);
}

describe('SelectedCompanyDetail', () => {
  it('renders decision-complete actions only when the selected company is ready', async () => {
    const loading = renderSelectedCompany({
      status: 'loading',
      company,
      retry: vi.fn(),
    });

    await screen.findByText('Acme');
    expect(screen.getByText('Acme')).toBeVisible();
    expect(
      screen.queryByRole('link', { name: 'View company' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'View jobs' }),
    ).not.toBeInTheDocument();

    loading.unmount();
    renderSelectedCompany({ status: 'ready', company, retry: vi.fn() });

    expect(
      await screen.findByRole('link', { name: 'View company' }),
    ).toHaveAttribute('href', '/companies/acme');
    expect(screen.getByRole('link', { name: 'View jobs' })).toHaveAttribute(
      'href',
      '/companies/acme/jobs',
    );
    expect(screen.getByRole('link', { name: 'Visit website' })).toHaveAttribute(
      'href',
      'https://acme.example',
    );
  });
});
