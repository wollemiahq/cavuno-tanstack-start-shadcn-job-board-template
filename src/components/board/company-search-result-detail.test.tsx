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
import { afterEach, describe, expect, it } from 'vitest';

import { CompanySearchResultDetail } from './company-search-result-detail';

import type { CompanyDetailVM } from '@/board/company-view-model';
import type { JobCardVM } from '@/board/job-view-model';
import type { OverallSalaryVM } from '@/board/salary-view-model';
import { SearchResultDetail } from '@/components/search-results/search-results';

const vm: CompanyDetailVM = {
  id: 'company-1',
  slug: 'acme-research',
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
  viewSalariesLabel: 'View salaries',
  websiteHeading: 'Website',
};

const jobPreviews: JobCardVM[] = Array.from({ length: 5 }, (_, index) => ({
  id: `job-${index + 1}`,
  title: `Role ${index + 1}`,
  companySlug: 'acme-research',
  jobSlug: `role-${index + 1}`,
  detailHref: `/companies/acme-research/jobs/role-${index + 1}`,
  companyName: 'Acme Research',
  companyLogoUrl: null,
  companyAvatarName: 'Acme Research',
  compLine: '$180K – $240K · Sydney (Hybrid)',
  salaryLabel: '$180K – $240K',
  locationLabel: 'Sydney (Hybrid)',
  summary: 'Build useful tools.',
  isFeatured: false,
  featuredLabel: 'Featured',
  postedAtLabel: '2d ago',
  tags: [],
}));

const salaryOverall: OverallSalaryVM = {
  headlineLabel: 'Average salary',
  headlineValue: '$180K – $240K',
  perYearSuffix: '/ yr',
  stats: [{ label: 'Based on', value: '12 jobs' }],
};

function renderDetail(ui: React.ReactNode) {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => (
      <SearchResultDetail label="Selected company">{ui}</SearchResultDetail>
    ),
  });
  const companyJobsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/companies/$companySlug/jobs',
    component: () => <p>Company jobs</p>,
  });
  const companySalariesRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/companies/$companySlug/salaries',
    component: () => <p>Company salaries</p>,
  });
  const companyJobRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/companies/$companySlug/jobs/$jobSlug',
    component: () => <p>Job detail</p>,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([
      indexRoute,
      companyJobsRoute,
      companySalariesRoute,
      companyJobRoute,
    ]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });

  return render(<RouterProvider router={router} />);
}

afterEach(cleanup);

describe('CompanySearchResultDetail', () => {
  it('replaces the expanded company hero with a compact action header at the shared boundary', async () => {
    const { container } = renderDetail(
      <CompanySearchResultDetail
        vm={vm}
        jobPreviews={jobPreviews}
        salaryOverall={salaryOverall}
        hasSalaries
      />,
    );

    const detail = await screen.findByRole('region', {
      name: 'Selected company',
    });
    const expanded = container.querySelector<HTMLElement>(
      "[data-slot='detail-expanded-header']",
    );
    const boundary = container.querySelector<HTMLElement>(
      "[data-slot='detail-hero-boundary']",
    );
    if (!expanded || !boundary)
      throw new Error('Company hero was not rendered');

    expect(
      container.querySelector("[data-slot='company-detail-expanded-header']"),
    ).toBeInTheDocument();
    expect(
      container.querySelector("[data-slot='search-detail-header']"),
    ).toBeNull();

    Object.defineProperty(boundary, 'offsetTop', {
      configurable: true,
      value: 200,
    });
    Object.defineProperty(detail, 'scrollTop', {
      configurable: true,
      value: 200,
      writable: true,
    });
    fireEvent.scroll(detail);

    expect(expanded).toHaveAttribute('aria-hidden', 'true');
    const compact = container.querySelector<HTMLElement>(
      "[data-slot='search-detail-header']",
    );
    if (!compact) throw new Error('Compact company header was not rendered');
    // The condensed header's name links to the company's own page.
    expect(
      within(compact).getByRole('link', { name: 'Acme Research' }),
    ).toHaveAttribute('href', '/companies/acme-research');
    expect(
      within(compact).getByRole('link', { name: 'View jobs' }),
    ).toBeVisible();
    expect(
      within(compact).getByRole('link', { name: 'View salaries' }),
    ).toBeVisible();
  });

  it('shows decision-complete company facts and only real actions', async () => {
    const { container } = renderDetail(
      <CompanySearchResultDetail
        vm={vm}
        jobPreviews={jobPreviews}
        salaryOverall={salaryOverall}
        hasSalaries
      />,
    );

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Acme Research' }),
    ).toBeVisible();
    expect(screen.getByText('3 open jobs')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'About Acme' })).toBeVisible();
    const marketLink = screen.getByRole('link', {
      name: 'Developer tools',
    });
    expect(marketLink).toHaveAttribute(
      'href',
      '/companies/markets/developer-tools',
    );
    expect(marketLink).toHaveAttribute('data-slot', 'badge');

    const websiteLink = screen.getByRole('link', { name: 'acme.example' });
    expect(websiteLink).toHaveAttribute('href', 'https://acme.example');
    expect(websiteLink).not.toHaveAttribute('data-slot', 'badge');

    const companyFacts = screen.getByText('Website').closest('dl');
    expect(companyFacts).toHaveAttribute('data-slot', 'company-detail-facts');
    expect(companyFacts).toContainElement(websiteLink);

    const header = container.querySelector<HTMLElement>(
      "[data-slot='company-detail-sticky-header']",
    );
    expect(header).not.toBeNull();
    if (!header) throw new Error('Company detail header was not rendered');
    expect(
      within(header).queryByRole('link', { name: 'View company' }),
    ).toBeNull();
    const viewJobsLink = within(header).getByRole('link', {
      name: 'View jobs',
    });
    expect(viewJobsLink).toHaveAttribute(
      'href',
      '/companies/acme-research/jobs',
    );
    expect(viewJobsLink).not.toHaveAttribute('role', 'button');
    const viewSalariesLink = within(header).getByRole('link', {
      name: 'View salaries',
    });
    expect(viewSalariesLink).toHaveAttribute(
      'href',
      '/companies/acme-research/salaries',
    );
    expect(viewSalariesLink).not.toHaveAttribute('role', 'button');
    expect(
      within(header).queryByRole('link', { name: 'Visit website' }),
    ).toBeNull();
    expect(
      screen.queryByRole('button', { name: /follow|save|contact/i }),
    ).toBeNull();

    const jobsHeading = screen.getByRole('heading', { name: 'Open jobs' });
    const salariesHeading = screen.getByRole('heading', { name: 'Salaries' });
    const marketsHeading = screen.getByRole('heading', { name: 'Markets' });
    expect(jobsHeading.compareDocumentPosition(salariesHeading)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(salariesHeading.compareDocumentPosition(marketsHeading)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(
      within(screen.getByRole('region', { name: 'Open jobs' })).getByRole(
        'link',
        { name: 'View all jobs' },
      ),
    ).toHaveAttribute('href', '/companies/acme-research/jobs');
    expect(
      within(screen.getByRole('region', { name: 'Salaries' })).getByRole(
        'link',
        { name: 'View salaries' },
      ),
    ).toHaveAttribute('href', '/companies/acme-research/salaries');
    expect(screen.getByRole('link', { name: 'Role 1' })).toHaveAttribute(
      'href',
      '/companies/acme-research/jobs/role-1',
    );
    expect(screen.getByRole('link', { name: 'Role 4' })).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Role 5' })).toBeNull();
    expect(screen.getByText('$180K – $240K')).toBeVisible();
    expect(screen.getByText('Based on 12 jobs')).toBeVisible();
    expect(container.querySelectorAll("[data-slot='card']")).toHaveLength(5);
  });

  it('states missing description and omits unavailable jobs and website actions', async () => {
    renderDetail(
      <CompanySearchResultDetail
        vm={{
          ...vm,
          descriptionHtml: null,
          websiteHref: null,
          websiteLabel: null,
        }}
        jobPreviews={[]}
        salaryOverall={null}
        hasSalaries={false}
      />,
    );

    expect(
      await screen.findByText('No company description provided.'),
    ).toBeVisible();
    expect(screen.getByText('3 open jobs')).toBeVisible();
    expect(screen.queryByRole('link', { name: 'View jobs' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'View all jobs' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Visit website' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'View salaries' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Salaries' })).toBeNull();
    expect(
      document.querySelector("[data-slot='company-detail-primary-actions']"),
    ).toBeNull();
  });

  it('hides all actions while a newly selected company is loading', async () => {
    renderDetail(
      <CompanySearchResultDetail
        vm={vm}
        jobPreviews={jobPreviews}
        salaryOverall={salaryOverall}
        hasSalaries
        interactive={false}
      />,
    );

    await screen.findByRole('heading', { level: 2, name: 'Acme Research' });
    expect(
      document.querySelector("[data-slot='company-detail-actions']"),
    ).toBeNull();
    expect(screen.queryByRole('link', { name: 'View company' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Acme Research' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'View jobs' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'View salaries' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Visit website' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Developer tools' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'acme.example' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Role 1' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Salaries' })).toBeNull();
  });
});
