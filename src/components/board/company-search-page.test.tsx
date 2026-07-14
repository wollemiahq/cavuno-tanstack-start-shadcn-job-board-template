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
  it('composes company controls, canonical result anchors, and named master-detail regions', async () => {
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
          query="acme"
          markets={[{ slug: 'technology', name: 'Technology' }]}
          startAd={{ label: 'Sponsored start', content: <p>Start creative</p> }}
          endAd={{ label: 'Sponsored end', content: <p>End creative</p> }}
          onSearchSubmit={vi.fn()}
          onMarketChange={vi.fn()}
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
    expect(screen.getByRole('searchbox', { name: 'Company name' })).toHaveValue(
      'acme',
    );
    expect(screen.getByRole('combobox', { name: 'Market' }).tagName).toBe(
      'BUTTON',
    );

    const results = screen.getByRole('region', { name: 'Company results' });
    const detail = screen.getByRole('region', { name: 'Selected company' });
    expect(
      within(results).getByRole('link', { name: /Acme/i }),
    ).toHaveAttribute('href', '/companies/acme');
    expect(screen.getByRole('link', { name: 'Technology' })).toHaveAttribute(
      'href',
      '/companies/markets/technology',
    );
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
          onSearchSubmit={vi.fn()}
          onMarketChange={vi.fn()}
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
});
