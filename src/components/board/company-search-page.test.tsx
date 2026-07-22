// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
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
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CompanySearchPage } from './company-search-page';

import { getCompanySearchLabels } from '@/board/company-search-labels';
import { toCompanyCardVM } from '@/board/company-view-model';
import { m } from '@/paraglide/messages';
import type { PublicCompany } from '@cavuno/board';

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
  links: { public: 'https://jobs.example/companies/acme' },
} as PublicCompany;

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

  it('uses a cursor Previous/Next pager for company-name search instead of numbered pages', async () => {
    const onNextResults = vi.fn();
    const onPreviousResults = vi.fn();
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
          onPageChange={vi.fn()}
          hasPreviousResults
          nextCursor="cursor-page-2"
          onPreviousResults={onPreviousResults}
          onNextResults={onNextResults}
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

    // companies.search is cursor-only (no offset), so free-text search paginates
    // by opaque cursor: a crawlable next anchor, never numbered page links.
    const next = await screen.findByRole('link', {
      name: m.pagination_nextPageLabel(),
    });
    expect(next).toHaveAttribute('href', '/?cursor=cursor-page-2');
    expect(
      screen.queryByRole('link', { name: `${m.pagination_ariaLabel()} 2` }),
    ).toBeNull();

    fireEvent.click(next);
    expect(onNextResults).toHaveBeenCalledTimes(1);

    fireEvent.click(
      screen.getByRole('link', { name: m.pagination_previousPageLabel() }),
    );
    expect(onPreviousResults).toHaveBeenCalledTimes(1);
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
});

describe('CompanySearchPage — arrival scroll', () => {
  // jsdom ships no scrollIntoView; the hook guards on its presence, so provide
  // a spy to observe the arrival alignment.
  const scrollIntoView = vi.fn();
  beforeEach(() => {
    scrollIntoView.mockClear();
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
    const target = scrollIntoView.mock.instances[0] as HTMLElement;
    expect(target.getAttribute('data-result-id')).toBe('acme');
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
