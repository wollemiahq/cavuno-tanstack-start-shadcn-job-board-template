// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { JobSearchPage } from './job-search-page';

import { toJobCardVM } from '@/board/job-view-model';
import { m } from '@/paraglide/messages';
import type { PublicJobCard } from '@cavuno/board';

const job: PublicJobCard = {
  id: 'job-1',
  object: 'job_card',
  slug: 'product-designer',
  title: 'Product designer',
  description: '<p>Own product discovery.</p>',
  publishedAt: null,
  employmentType: 'full_time',
  remoteOption: 'hybrid',
  remoteLocationLabel: null,
  remoteWorldwide: null,
  remoteWorkPermitCountryCodes: [],
  locationLabel: 'Sydney',
  salaryMin: null,
  salaryMax: null,
  salaryCurrency: null,
  salaryTimeframe: null,
  isFeatured: false,
  isSponsored: false,
  summary: null,
  company: { slug: 'acme', name: 'Acme', logoUrl: null },
  categories: [],
  skills: [],
  links: {
    public: 'https://jobs.example/companies/acme/jobs/product-designer',
  },
};

// The mapping seam now lives in the loader/pane, so the page takes resolved
// `JobCardVM[]`; the test maps the wire fixture the same way a route would.
const jobVm = toJobCardVM(job, 'en');

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  });
});

afterEach(cleanup);

describe('JobSearchPage — search results pattern', () => {
  it('leaves keyword and location search to the header and puts filters before the page heading', async () => {
    const rootRoute = createRootRoute();
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
      component: () => (
        <JobSearchPage
          jobs={[jobVm]}
          count={12}
          page={1}
          pageSize={20}
          filters={{ q: 'product designer' }}
          language="en"
          viewer={null}
          onSaveJob={vi.fn(async () => {})}
          onFiltersChange={vi.fn()}
          onPageChange={vi.fn()}
          selectedJob="product-designer"
          onSelectedJobReplace={vi.fn()}
          onSelectedJobPush={vi.fn()}
          detail={<p>Selected job details</p>}
        />
      ),
    });
    const jobRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/companies/$companySlug/jobs/$jobSlug',
      component: () => <p>Full job</p>,
    });
    const router = createRouter({
      routeTree: rootRoute.addChildren([indexRoute, jobRoute]),
      history: createMemoryHistory({ initialEntries: ['/'] }),
    });
    const { container } = render(<RouterProvider router={router} />);

    await screen.findByRole('main');
    expect(container.querySelectorAll('main')).toHaveLength(1);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('combobox', { name: /location/i }),
    ).not.toBeInTheDocument();

    const filterBar = container.querySelector("[data-slot='jobs-filter-bar']");
    const heading = screen.getByRole('heading', {
      level: 1,
      name: m.jobSearch_resultsCount({ count: 12, countLabel: '12' }),
    });
    expect(filterBar).toBeInTheDocument();
    if (!filterBar) throw new Error('Expected the Jobs filter bar');
    expect(
      filterBar.compareDocumentPosition(heading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);

    const results = screen.getByRole('region', {
      name: m.jobSearch_resultsRegionLabel(),
    });
    const detail = screen.getByRole('region', {
      name: m.jobSearch_selectedJobRegionLabel(),
    });
    expect(screen.queryByRole('navigation', { name: 'Breadcrumb' })).toBeNull();
    expect(
      within(results).getByRole('link', { name: /Product designer/i }),
    ).toHaveAttribute('href', '/companies/acme/jobs/product-designer');
    expect(detail).toHaveTextContent('Selected job details');
  });

  it('uses the full results canvas for a search with no matching jobs', async () => {
    const rootRoute = createRootRoute();
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
      component: () => (
        <JobSearchPage
          jobs={[]}
          count={0}
          page={1}
          pageSize={20}
          filters={{ q: 'no-such-role' }}
          language="en"
          viewer={null}
          onSaveJob={vi.fn(async () => {})}
          onFiltersChange={vi.fn()}
          onPageChange={vi.fn()}
          onSelectedJobReplace={vi.fn()}
          onSelectedJobPush={vi.fn()}
          detail={<p>Unused detail pane</p>}
          startAd={{ label: 'Sponsored start', content: <p>Start creative</p> }}
          endAd={{ label: 'Sponsored end', content: <p>End creative</p> }}
        />
      ),
    });
    const jobsRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/jobs',
      component: () => null,
    });
    const router = createRouter({
      routeTree: rootRoute.addChildren([indexRoute, jobsRoute]),
      history: createMemoryHistory({ initialEntries: ['/'] }),
    });
    const { container } = render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: m.jobSearch_resultsCount({ count: 0, countLabel: '0' }),
      }),
    ).toBeVisible();
    expect(
      screen.getByText(m.jobSearch_noMatchingResultsHeading()),
    ).toBeVisible();
    expect(
      screen.getByRole('link', {
        name: m.jobSearch_resetFiltersAction(),
      }),
    ).toHaveAttribute('href', '/jobs');
    expect(
      container.querySelector("[data-slot='search-results-layout']"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('complementary', { name: 'Sponsored start' }),
    ).toHaveTextContent('Start creative');
    expect(
      screen.getByRole('complementary', { name: 'Sponsored end' }),
    ).toHaveTextContent('End creative');
    expect(
      screen.queryByRole('region', {
        name: m.jobSearch_selectedJobRegionLabel(),
      }),
    ).toBeNull();
    expect(screen.queryByText('Unused detail pane')).toBeNull();
  });

  it('treats an empty programmatic route as a no-match search with reset', async () => {
    const rootRoute = createRootRoute();
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
      component: () => (
        <JobSearchPage
          jobs={[]}
          count={0}
          page={1}
          pageSize={20}
          filters={{}}
          heading="0 React jobs"
          language="en"
          viewer={null}
          onSaveJob={vi.fn(async () => {})}
          onFiltersChange={vi.fn()}
          onPageChange={vi.fn()}
          onSelectedJobReplace={vi.fn()}
          onSelectedJobPush={vi.fn()}
          detail={null}
        />
      ),
    });
    const jobsRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/jobs',
      component: () => null,
    });
    const router = createRouter({
      routeTree: rootRoute.addChildren([indexRoute, jobsRoute]),
      history: createMemoryHistory({ initialEntries: ['/'] }),
    });
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByText(m.jobSearch_noMatchingResultsHeading()),
    ).toBeVisible();
    expect(
      screen.getByRole('link', {
        name: m.jobSearch_resetFiltersAction(),
      }),
    ).toHaveAttribute('href', '/jobs');
  });

  it('surfaces withheld results in an owned alert without changing the access action', async () => {
    const rootRoute = createRootRoute();
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
      component: () => (
        <JobSearchPage
          jobs={[jobVm]}
          count={1}
          gatedCount={24}
          page={1}
          pageSize={20}
          filters={{}}
          language="en"
          viewer={null}
          onSaveJob={vi.fn(async () => {})}
          onFiltersChange={vi.fn()}
          onPageChange={vi.fn()}
          selectedJob="product-designer"
          onSelectedJobReplace={vi.fn()}
          onSelectedJobPush={vi.fn()}
          detail={<p>Selected job details</p>}
        />
      ),
    });
    const jobRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/companies/$companySlug/jobs/$jobSlug',
      component: () => <p>Full job</p>,
    });
    const router = createRouter({
      routeTree: rootRoute.addChildren([indexRoute, jobRoute]),
      history: createMemoryHistory({ initialEntries: ['/'] }),
    });
    render(<RouterProvider router={router} />);

    const alert = await screen.findByRole('alert', {
      name: m.jobSearch_unlockMoreLabel(),
    });
    expect(alert).toHaveAttribute('data-slot', 'alert');
    expect(alert).toHaveTextContent(
      m.jobSearch_gatedCountText({ count: '24' }),
    );
    // The unlock action links to the paywall and carries the originating path
    // as `returnTo`, so the buyer is returned here once the grant is confirmed.
    expect(
      within(alert).getByRole('link', {
        name: m.jobSearch_unlockMoreLabel(),
      }),
    ).toHaveAttribute('href', '/account/access?returnTo=%2F');
  });
});
