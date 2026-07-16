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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CompanySearchPage } from './company-search-page';

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
          companies={[company]}
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

  it('uses cursor load-more for company-name search instead of page-number pagination', async () => {
    const onLoadMore = vi.fn();
    const rootRoute = createRootRoute();
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
      component: () => (
        <CompanySearchPage
          companies={[company]}
          count={30}
          page={1}
          pageSize={24}
          query="acme"
          markets={[]}
          onPageChange={vi.fn()}
          hasMore
          onLoadMore={onLoadMore}
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

    fireEvent.click(
      await screen.findByRole('button', { name: 'Next results' }),
    );

    expect(onLoadMore).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole('navigation', { name: /pagination/i }),
    ).not.toBeInTheDocument();
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
