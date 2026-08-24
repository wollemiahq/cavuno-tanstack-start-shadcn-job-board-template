// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { useState } from 'react';

import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CompanySearchPage } from './company-search-page';

import { getCompanySearchLabels } from '@/board/company-search-labels';
import { toCompanyCardVM } from '@/board/company-view-model';
import { m } from '@/paraglide/messages';
import type { PublicCompany } from '@cavuno/board';

const company: PublicCompany = {
  id: 'company-1',
  object: 'public_company',
  slug: 'acme',
  name: 'Acme',
  logoUrl: null,
  website: 'https://acme.example',
  summary: 'Builds rockets.',
  description: '<p>Builds rockets.</p>',
  jobCount: 3,
  publishedJobCount: 3,
  salarySampleCount: 0,
  links: { public: 'https://jobs.example/companies/acme' },
};

// The page now takes resolved `CompanyCardVM[]`; the test maps the wire
// fixture exactly as the route pane does.
const companyVm = toCompanyCardVM(company, getCompanySearchLabels());

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

describe('CompanySearchPage — search results pattern', () => {
  it('uses the same condensed filter, results, and detail structure as jobs', async () => {
    const rootRoute = createRootRoute();
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
      component: () => (
        <CompanySearchPage
          companies={[companyVm]}
          count={1}
          page={1}
          pageSize={24}
          breadcrumb={{
            ariaLabel: 'Breadcrumb',
            items: [
              { name: 'Companies', href: '/companies' },
              { name: 'Technology' },
            ],
          }}
          query="acme"
          heading="Companies"
          markets={[{ slug: 'technology', name: 'Technology' }]}
          startAd={{ label: 'Sponsored start', content: <p>Start creative</p> }}
          endAd={{ label: 'Sponsored end', content: <p>End creative</p> }}
          onPageChange={vi.fn()}
          selectedCompany="acme"
          onSelectedCompanyReplace={vi.fn()}
          onSelectedCompanyPush={vi.fn()}
          detail={<p>Selected company details</p>}
        />
      ),
    });
    const companyRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/companies/$companySlug',
      component: () => <p>Full company</p>,
    });
    const router = createRouter({
      routeTree: rootRoute.addChildren([indexRoute, companyRoute]),
      history: createMemoryHistory({ initialEntries: ['/'] }),
    });
    const { container } = render(<RouterProvider router={router} />);

    await screen.findByRole('main');
    expect(container.querySelectorAll('main')).toHaveLength(1);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      '1 company',
    );
    expect(screen.queryByText(/Companies and employers hiring on/)).toBeNull();
    expect(
      screen.queryByRole('searchbox', { name: 'Company name' }),
    ).toBeNull();
    expect(screen.queryByRole('combobox', { name: 'Market' })).toBeNull();
    expect(
      container.querySelector("[data-slot='company-filter-bar']"),
    ).toBeNull();
    expect(
      container.querySelector("[data-slot='company-search-form']"),
    ).toBeNull();
    expect(
      container.querySelector("[data-slot='search-results-layout']"),
    ).not.toBeNull();

    const results = screen.getByRole('region', { name: 'Company results' });
    const detail = screen.getByRole('region', { name: 'Selected company' });
    expect(screen.queryByRole('navigation', { name: 'Breadcrumb' })).toBeNull();
    expect(
      within(results).getByRole('link', { name: /Acme/i }),
    ).toHaveAttribute('href', '/companies/acme');
    expect(
      within(
        screen.getByRole('region', { name: 'Browse by market' }),
      ).getByRole('link', { name: 'Technology' }),
    ).toHaveAttribute('href', '/companies/markets/technology');
    expect(
      screen.getByRole('complementary', { name: 'Sponsored start' }),
    ).toHaveTextContent('Start creative');
    expect(
      screen.getByRole('complementary', { name: 'Sponsored end' }),
    ).toHaveTextContent('End creative');
    expect(detail).toHaveTextContent('Selected company details');
  });

  it('uses numbered, crawlable page links for company-name search, unified with browse', async () => {
    const onPageChange = vi.fn();
    const rootRoute = createRootRoute();
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
      component: () => (
        <CompanySearchPage
          companies={[companyVm]}
          count={30}
          page={1}
          pageSize={24}
          query="acme"
          markets={[]}
          onPageChange={onPageChange}
          onSelectedCompanyReplace={vi.fn()}
          onSelectedCompanyPush={vi.fn()}
          detail={<p>Selected company details</p>}
        />
      ),
    });
    const router = createRouter({
      routeTree: rootRoute.addChildren([indexRoute]),
      history: createMemoryHistory({ initialEntries: ['/'] }),
    });
    render(<RouterProvider router={router} />);

    // companies.search is now offset-paginated with a total, so free-text search
    // paginates by numbered ?page= anchors, the same as browse.
    const pageTwo = await screen.findByRole('link', {
      name: `${m.pagination_ariaLabel()} 2`,
    });
    expect(pageTwo).toHaveAttribute('href', '/?page=2');

    fireEvent.click(pageTwo);
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('keeps a no-match search inside the sponsored workspace and offers a primary reset', async () => {
    const rootRoute = createRootRoute();
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
      component: () => (
        <CompanySearchPage
          companies={[]}
          count={0}
          page={1}
          pageSize={24}
          query="no-such-company"
          markets={[]}
          onPageChange={vi.fn()}
          onSelectedCompanyReplace={vi.fn()}
          onSelectedCompanyPush={vi.fn()}
          detail={<p>Unused company detail</p>}
          startAd={{ label: 'Sponsored start', content: <p>Start creative</p> }}
          endAd={{ label: 'Sponsored end', content: <p>End creative</p> }}
        />
      ),
    });
    const router = createRouter({
      routeTree: rootRoute.addChildren([indexRoute]),
      history: createMemoryHistory({ initialEntries: ['/'] }),
    });
    const { container } = render(<RouterProvider router={router} />);

    expect(await screen.findByText(/no-such-company/i)).toBeVisible();
    expect(screen.getByRole('link', { name: 'Reset filters' })).toHaveAttribute(
      'href',
      '/companies',
    );
    expect(
      container.querySelector("[data-slot='search-results-layout']"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('complementary', { name: 'Sponsored start' }),
    ).toHaveTextContent('Start creative');
    expect(
      screen.getByRole('complementary', { name: 'Sponsored end' }),
    ).toHaveTextContent('End creative');
    expect(screen.queryByText('Unused company detail')).toBeNull();
  });

  it('shows a company-specific temporary-unavailable state without a zero-result count', async () => {
    const rootRoute = createRootRoute();
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
      component: () => (
        <CompanySearchPage
          companies={[]}
          count={0}
          page={1}
          pageSize={24}
          query="acme"
          searchUnavailable
          markets={[]}
          onPageChange={vi.fn()}
          onSelectedCompanyReplace={vi.fn()}
          onSelectedCompanyPush={vi.fn()}
          detail={null}
        />
      ),
    });
    const router = createRouter({
      routeTree: rootRoute.addChildren([indexRoute]),
      history: createMemoryHistory({ initialEntries: ['/'] }),
    });
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByText('Company search is temporarily unavailable'),
    ).toBeVisible();
    expect(screen.queryByText('0 companies')).toBeNull();
    expect(screen.queryByRole('link', { name: 'Reset filters' })).toBeNull();
  });
});

describe('CompanySearchPage — results description line', () => {
  function renderPage(
    props: Partial<React.ComponentProps<typeof CompanySearchPage>>,
  ) {
    const rootRoute = createRootRoute();
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
      component: () => (
        <CompanySearchPage
          companies={[companyVm]}
          count={1}
          page={1}
          pageSize={24}
          markets={[]}
          onPageChange={vi.fn()}
          onSelectedCompanyReplace={vi.fn()}
          onSelectedCompanyPush={vi.fn()}
          detail={<p>Selected company details</p>}
          {...props}
        />
      ),
    });
    const router = createRouter({
      routeTree: rootRoute.addChildren([indexRoute]),
      history: createMemoryHistory({ initialEntries: ['/'] }),
    });
    return render(<RouterProvider router={router} />);
  }

  it('renders the exact "Showing X–Y of N" range on the browse index (offset)', async () => {
    // Browse mode (no free-text query) is offset-paginated with a total, so the
    // description line states the precise range.
    renderPage({ count: 37, page: 1, pageSize: 24 });

    expect(
      await screen.findByText('Showing 1–24 of 37 companies'),
    ).toBeVisible();
  });

  it('renders the same exact range for free-text search, now offset-paginated', async () => {
    // Search is unified with browse: offset pagination with a total, so the line
    // states the precise range — never a fabricated cursor count.
    renderPage({ query: 'acme', count: 37, page: 2, pageSize: 24 });

    expect(
      await screen.findByText('Showing 25–37 of 37 companies'),
    ).toBeVisible();
    expect(screen.queryByText(/more available/)).toBeNull();
  });
});

describe('CompanySearchPage — arrival scroll', () => {
  // jsdom ships no scrollIntoView; the hook guards on its presence, so provide
  // a spy to observe the arrival alignment.
  const scrolledResultIds: Array<string | null> = [];
  const scrollIntoView = vi.fn(function (this: Element) {
    scrolledResultIds.push(this.getAttribute('data-result-id'));
  });
  beforeEach(() => {
    scrollIntoView.mockClear();
    scrolledResultIds.length = 0;
    Element.prototype.scrollIntoView = scrollIntoView;
  });

  function renderArrival(initialSelected?: string) {
    function ArrivalHarness() {
      const [selected, setSelected] = useState(initialSelected);
      return (
        <>
          <button type="button" onClick={() => setSelected('acme')}>
            select-acme
          </button>
          <CompanySearchPage
            companies={[companyVm]}
            count={1}
            page={1}
            pageSize={24}
            markets={[]}
            onPageChange={vi.fn()}
            selectedCompany={selected}
            onSelectedCompanyReplace={vi.fn()}
            onSelectedCompanyPush={vi.fn()}
            detail={<p>Selected company details</p>}
          />
        </>
      );
    }
    const rootRoute = createRootRoute();
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
      component: ArrivalHarness,
    });
    const router = createRouter({
      routeTree: rootRoute.addChildren([indexRoute]),
      history: createMemoryHistory({ initialEntries: ['/'] }),
    });
    return render(<RouterProvider router={router} />);
  }

  it('scrolls the URL-selected row to the top on arrival', async () => {
    renderArrival('acme');

    await screen.findByRole('main');
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start' });
    expect(scrolledResultIds).toEqual(['acme']);
  });

  it('does not scroll a manual selection made after arrival', async () => {
    renderArrival(undefined);

    await screen.findByRole('main');
    expect(scrollIntoView).not.toHaveBeenCalled();

    // A post-mount selection (as from an in-page click) must not yank the list.
    fireEvent.click(screen.getByRole('button', { name: 'select-acme' }));
    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});
