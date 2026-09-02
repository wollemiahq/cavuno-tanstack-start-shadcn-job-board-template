// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { JobSearchResult } from './job-search-result';

import { makeJobCardVM } from '@/test/fixtures';

const vm = makeJobCardVM({
  id: 'job-1',
  title: 'Product designer',
  companySlug: 'acme',
  jobSlug: 'product-designer',
  detailHref: '/companies/acme/jobs/product-designer',
  isFeatured: true,
  postedAtLabel: 'posted label',
  tags: [
    { key: 'category-design', name: 'Design', href: '/jobs/categories/design' },
    { key: 'skill-figma', name: 'Figma', href: '/jobs/skills/figma' },
  ],
});

afterEach(cleanup);

function renderResult(ui: React.ReactElement) {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => ui,
  });
  const jobRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/companies/$companySlug/jobs/$jobSlug',
    component: () => <h1>Job</h1>,
  });
  const jobsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/jobs',
    component: () => <h1>Jobs</h1>,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, jobRoute, jobsRoute]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  return render(<RouterProvider router={router} />);
}

describe('JobSearchResult', () => {
  it('uses an owned Card with a canonical title Link and no taxonomy clutter', async () => {
    const { container } = renderResult(
      <JobSearchResult vm={vm} selected />,
    );

    const link = await screen.findByRole('link', { name: /Product designer/i });
    expect(link).toHaveAttribute(
      'href',
      '/companies/acme/jobs/product-designer',
    );
    expect(
      container.querySelector("[data-slot='search-result-card']"),
    ).toHaveAttribute('data-selected', 'true');
    expect(
      container
        .querySelector("[data-slot='search-result-card']")
        ?.querySelector("[data-slot='card']"),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Design' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Figma' })).toBeNull();
    expect(container.querySelector('a a')).toBeNull();
  });

  it('renders honest compact metadata and a transparent paid-placement label', async () => {
    renderResult(<JobSearchResult vm={vm} />);
    await screen.findByRole('link', { name: /Product designer/i });

    expect(screen.getByText(vm.companyName!)).toBeVisible();
    expect(screen.getByText(vm.locationLabel)).toBeVisible();
    expect(screen.getByText(vm.salaryLabel!)).toBeVisible();
    expect(screen.getByText(vm.summary!)).toBeVisible();
    expect(screen.getByText(vm.postedAtLabel!)).toBeVisible();
    expect(screen.getByText(vm.featuredLabel)).toBeVisible();
  });

  it('keeps essential location while omitting unavailable optional metadata', async () => {
    renderResult(
      <JobSearchResult
        vm={{
          ...vm,
          companyName: null,
          compLine: null,
          salaryLabel: null,
          summary: null,
          postedAtLabel: null,
          isFeatured: false,
        }}
      />,
    );
    await screen.findByRole('link', { name: /Product designer/i });

    expect(screen.queryByText(vm.companyName!)).toBeNull();
    expect(screen.getByText(vm.locationLabel)).toBeVisible();
    expect(screen.queryByText(vm.salaryLabel!)).toBeNull();
    expect(screen.queryByText(vm.featuredLabel)).toBeNull();
  });

  it('keeps a trailing Save control above the card link without navigating', async () => {
    const onSave = vi.fn();
    renderResult(
      <JobSearchResult
        vm={vm}
        saveSlot={
          <button type="button" aria-label="Save job" onClick={onSave}>
            Save
          </button>
        }
      />,
    );
    await screen.findByRole('link', { name: /Product designer/i });

    fireEvent.click(screen.getByRole('button', { name: 'Save job' }));
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});
