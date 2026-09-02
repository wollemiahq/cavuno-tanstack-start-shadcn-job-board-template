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
import { afterEach, describe, expect, it } from 'vitest';

import { CompanySearchResult } from './company-search-result';

import type { CompanyCardVM } from '@/board/company-view-model';

const vm: CompanyCardVM = {
  id: 'company-1',
  slug: 'acme-research',
  name: 'Acme Research',
  logoUrl: 'https://cdn.example/acme.svg',
  avatarName: 'Acme Research',
  descriptionText: 'Research tools for ambitious engineering teams.',
  detailHref: '/companies/acme-research',
  publishedJobCount: 3,
  openJobsLabel: '3 open jobs',
};

afterEach(cleanup);

function renderResult(ui: React.ReactElement) {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => ui,
  });
  const companyRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/companies/$companySlug',
    component: () => <h1>Company</h1>,
  });
  const companiesRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/companies',
    component: () => <h1>Companies</h1>,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([
      indexRoute,
      companyRoute,
      companiesRoute,
    ]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  return render(<RouterProvider router={router} />);
}

describe('CompanySearchResult', () => {
  it('uses one canonical Link with visible selected state and real company facts', async () => {
    const { container } = renderResult(
      <CompanySearchResult vm={vm} selected />,
    );

    const link = await screen.findByRole('link', { name: /Acme Research/i });
    expect(link).toHaveAttribute('href', '/companies/acme-research');
    expect(link).toHaveAttribute('aria-current', 'true');
    expect(
      container.querySelector("[data-slot='search-result-card']"),
    ).toHaveAttribute('data-selected', 'true');
    expect(
      screen.getByText('Research tools for ambitious engineering teams.'),
    ).toBeVisible();
    expect(screen.getByText('3 open jobs')).toBeVisible();
    expect(container.querySelector("[data-slot='avatar']")).toBeInTheDocument();
  });

  it('falls back to initials and omits missing description and zero-job noise', async () => {
    renderResult(
      <CompanySearchResult
        vm={{
          ...vm,
          logoUrl: null,
          descriptionText: null,
          publishedJobCount: 0,
          openJobsLabel: null,
        }}
      />,
    );
    await screen.findByRole('link', { name: /Acme Research/i });

    expect(screen.getByText('AR')).toBeVisible();
    expect(
      screen.queryByText('Research tools for ambitious engineering teams.'),
    ).toBeNull();
    expect(screen.queryByText(/open jobs/i)).toBeNull();
  });
});
