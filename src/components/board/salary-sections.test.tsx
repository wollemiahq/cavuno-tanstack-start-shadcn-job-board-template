// @vitest-environment jsdom
/**
 * CompanySalarySummary — the Overview-tab salary summary. The
 * Overview reads as a page of section summaries: it already previews the
 * company's jobs, and this block condenses the Salaries tab into the same
 * rhythm — the company's overall salary range + a few top category rows +
 * a link INTO the full Salaries tab. It reuses the salary display
 * components (`OverallSalaryCard` for the range, `SalaryRail` for the
 * category rows) rather than hand-rolling salary markup.
 */
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { CompanySalarySummary } from './salary-sections';

import type { OverallSalaryVM, SalaryRailVM } from '@/board/salary-view-model';
import { AppRouterProvider } from '@/components/app-router-provider';

afterEach(cleanup);

// Fixture values are NOT formatter-shaped; assertions reference them
// symbolically (formatted output is pinned once, by the SDK goldens).
const overall: OverallSalaryVM = {
  headlineLabel: 'Average salary',
  headlineValue: 'overall range value',
  perYearSuffix: '/ yr',
  stats: [{ label: 'Based on', value: '54 jobs' }],
};

const categories: SalaryRailVM = {
  items: [
    {
      name: 'Software Engineering',
      href: '/companies/anduril/salaries/software-engineering',
      range: 'category range a',
      jobCountLabel: '20 jobs',
    },
    {
      name: 'Hardware',
      href: '/companies/anduril/salaries/hardware',
      range: 'category range b',
      jobCountLabel: '10 jobs',
    },
  ],
};

/** Mount under a real router so the Button `href` seam renders as an anchor. */
function renderSummary() {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => (
      <AppRouterProvider>
        <CompanySalarySummary
          title="Salaries"
          overall={overall}
          categories={categories}
          viewAllHref="/companies/anduril/salaries"
          viewAllLabel="View salaries"
        />
      </AppRouterProvider>
    ),
  });
  const salariesRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/companies/$companySlug/salaries',
    component: () => null,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, salariesRoute]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  render(<RouterProvider router={router} />);
}

describe('CompanySalarySummary — condenses the Salaries tab on the Overview', () => {
  it('shows the overall range, the top category rows, and a link into the Salaries tab', async () => {
    renderSummary();

    // A titled "Salaries" summary section (parallel to the jobs preview).
    expect(
      await screen.findByRole('heading', { name: 'Salaries' }),
    ).toBeTruthy();

    // The overall salary range, condensed from the Salaries tab.
    expect(screen.getByText(overall.headlineValue)).toBeTruthy();

    // The top category rows carry each category's name + range.
    expect(screen.getByText('Software Engineering')).toBeTruthy();
    expect(screen.getByText(categories.items[0].range)).toBeTruthy();
    expect(screen.getByText('Hardware')).toBeTruthy();

    // The "View salaries" CTA is a real anchor into the salaries tab (the
    // internal-linking seam that lets the summary defer to the full page).
    const link = screen.getByRole('link', { name: /View salaries/ });
    expect(link.tagName).toBe('A');
    expect(link.getAttribute('href')).toBe('/companies/anduril/salaries');
  });
});
