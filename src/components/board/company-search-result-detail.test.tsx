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
import { afterEach, describe, expect, it } from 'vitest';

import { CompanySearchResultDetail } from './company-search-result-detail';

import type { CompanyDetailVM } from '@/board/company-view-model';

const vm: CompanyDetailVM = {
  id: 'company-1',
  name: 'Acme Research',
  logoUrl: null,
  avatarName: 'Acme Research',
  detailHref: '/companies/acme-research',
  companySlug: 'acme-research',
  publishedJobCount: 3,
  openJobsLabel: '3 open jobs',
  descriptionHtml:
    '<h3>About Acme</h3><p>Research tools for engineering teams.</p>',
  noDescriptionText: 'No company description provided.',
  marketChips: [
    {
      key: 'developer-tools',
      name: 'Developer tools',
      href: '/companies/markets/developer-tools',
    },
  ],
  marketsHeading: 'Markets',
  websiteHref: 'https://acme.example',
  websiteLabel: 'acme.example',
  viewCompanyLabel: 'View company',
  viewJobsLabel: 'View jobs',
  visitWebsiteLabel: 'Visit website',
  websiteHeading: 'Website',
};

function renderDetail(ui: React.ReactNode) {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => ui,
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

afterEach(cleanup);

describe('CompanySearchResultDetail', () => {
  it('shows decision-complete company facts and only real actions', async () => {
    const { container } = renderDetail(<CompanySearchResultDetail vm={vm} />);

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Acme Research' }),
    ).toBeVisible();
    expect(screen.getByText('3 open jobs')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'About Acme' })).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'Developer tools' }),
    ).toHaveAttribute('href', '/companies/markets/developer-tools');
    expect(screen.getByRole('link', { name: 'acme.example' })).toHaveAttribute(
      'href',
      'https://acme.example',
    );

    const actions = container.querySelector<HTMLElement>(
      "[data-slot='company-detail-actions']",
    );
    expect(actions).not.toBeNull();
    if (!actions) throw new Error('Company detail actions were not rendered');
    expect(
      within(actions).getByRole('link', { name: 'View company' }),
    ).toHaveAttribute('href', '/companies/acme-research');
    expect(
      within(actions).getByRole('link', { name: 'View jobs' }),
    ).toHaveAttribute('href', '/companies/acme-research/jobs');
    expect(
      within(actions).getByRole('link', { name: 'Visit website' }),
    ).toHaveAttribute('href', 'https://acme.example');
    expect(
      screen.queryByRole('button', { name: /follow|save|contact/i }),
    ).toBeNull();
  });

  it('states missing description and omits unavailable jobs and website actions', async () => {
    renderDetail(
      <CompanySearchResultDetail
        vm={{
          ...vm,
          descriptionHtml: null,
          publishedJobCount: 0,
          openJobsLabel: '0 open jobs',
          websiteHref: null,
          websiteLabel: null,
        }}
      />,
    );

    expect(
      await screen.findByText('No company description provided.'),
    ).toBeVisible();
    expect(screen.getByText('0 open jobs')).toBeVisible();
    expect(screen.queryByRole('link', { name: 'View jobs' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Visit website' })).toBeNull();
  });

  it('hides all actions while a newly selected company is loading', async () => {
    renderDetail(<CompanySearchResultDetail vm={vm} interactive={false} />);

    await screen.findByRole('heading', { level: 2, name: 'Acme Research' });
    expect(
      document.querySelector("[data-slot='company-detail-actions']"),
    ).toBeNull();
    expect(screen.queryByRole('link', { name: 'View company' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'View jobs' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Visit website' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Developer tools' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'acme.example' })).toBeNull();
  });
});
