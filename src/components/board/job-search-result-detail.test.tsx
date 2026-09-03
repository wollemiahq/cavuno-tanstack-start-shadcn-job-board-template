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
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { JobSearchResultDetail } from './job-search-result-detail';

import type { JobDetailVM } from '@/board/job-detail-view-model';
import { SearchResultDetail } from '@/components/search-results/search-results';

const vm: JobDetailVM = {
  breadcrumbs: [],
  breadcrumbAriaLabel: 'Breadcrumbs',
  title: 'Product designer',
  companyName: 'Acme',
  companyLogoUrl: null,
  companyAvatarName: 'Acme',
  sector: 'Design',
  // Values are NOT formatter-shaped; formatted output is pinned by the
  // SDK goldens, and assertions below reference these fields symbolically.
  locationLabel: 'location label',
  workplaceLabel: 'workplace label',
  employmentTypeLabel: 'employment label',
  seniorityLabel: 'seniority label',
  salaryLabel: 'salary label',
  publishedLabel: 'published label',
  canonicalUrl: 'https://jobs.example.com/companies/acme/jobs/product-designer',
  detailHref: '/companies/acme/jobs/product-designer',
  descriptionHtml: '<h2>About the role</h2><p>Own product discovery.</p>',
  noDescriptionText: 'No description provided.',
  facts: [{ label: 'Work permits', value: 'Australia' }],
  categoryChips: [{ key: 'design', name: 'Design', href: '/jobs/design' }],
  skillChips: [{ key: 'figma', name: 'Figma', href: '/jobs/skills/figma' }],
  categoriesHeading: 'Categories',
  skillsHeading: 'Skills',
  customFields: [
    { key: 'portfolio', label: 'Portfolio required', value: 'Yes' },
  ],
  additionalDetailsHeading: 'Additional details',
  company: {
    name: 'Acme',
    logoUrl: null,
    websiteHref: 'https://acme.example',
    websiteLabel: 'acme.example',
    href: '/companies/acme',
    intro: 'Acme builds tools for modern product teams.',
    viewProfileLabel: 'View company profile',
    membershipPlanName: null,
  },
  similar: [],
  similarJobsHeading: 'Similar jobs',
};

afterEach(cleanup);

function renderDetail(ui: React.ReactElement) {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => ui,
  });
  const stubs = [
    '/companies/$companySlug',
    '/companies/$companySlug/jobs/$jobSlug',
    '/jobs/skills/$skill',
    '/jobs/$keyword',
  ].map((path) =>
    createRoute({
      getParentRoute: () => rootRoute,
      path,
      component: () => null,
    }),
  );
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, ...stubs]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  return render(<RouterProvider router={router} />);
}

describe('JobSearchResultDetail', () => {
  it('is decision-complete without importing full-page SEO composition', async () => {
    renderDetail(
      <JobSearchResultDetail
        vm={vm}
        applySlot={<button>Apply</button>}
        saveSlot={<button>Save</button>}
      />,
    );

    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'Product designer',
      }),
    ).toBeVisible();
    expect(screen.getByText(vm.salaryLabel!)).toBeVisible();
    expect(
      screen.getByText(vm.salaryLabel!).closest('[data-slot="badge"]'),
    ).not.toBeNull();
    expect(screen.getByText(vm.workplaceLabel!)).toBeVisible();
    expect(screen.getByText(new RegExp(vm.locationLabel!))).toBeVisible();
    expect(
      screen.getByRole('heading', { name: 'About the role' }),
    ).toBeVisible();
    expect(screen.getByText('Work permits')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Design' })).toHaveAttribute(
      'href',
      '/jobs/design',
    );
    expect(screen.getByRole('link', { name: 'Figma' })).toHaveAttribute(
      'href',
      '/jobs/skills/figma',
    );
    expect(screen.getByText('Portfolio required')).toBeVisible();
    const title = screen.getByRole('heading', {
      level: 2,
      name: 'Product designer',
    });
    const titleLink = within(title).getByRole('link', {
      name: 'Product designer',
    });
    expect(title).toContainElement(titleLink);
    expect(titleLink).toHaveAttribute(
      'href',
      '/companies/acme/jobs/product-designer',
    );
    expect(titleLink).not.toHaveAttribute('target');
    const primaryActions = document.querySelector<HTMLElement>(
      "[data-slot='job-detail-primary-actions']",
    );
    expect(primaryActions).toContainElement(
      screen.getByRole('button', { name: 'Apply' }),
    );
    expect(primaryActions).toContainElement(
      screen.getByRole('button', { name: 'Save' }),
    );
    expect(
      primaryActions?.closest('[data-slot="job-detail-expanded-header"]'),
    ).toContainElement(title);
    expect(
      document.querySelector('[data-slot="detail-hero-boundary"]'),
    ).toBeInTheDocument();
    if (!primaryActions)
      throw new Error('Expected the primary job actions to render');
    expect(
      within(primaryActions).getByTestId('job-detail-apply-action'),
    ).toContainElement(screen.getByRole('button', { name: 'Apply' }));
    expect(
      within(primaryActions).getByTestId('job-detail-save-action'),
    ).toContainElement(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getAllByText('Product designer')).toHaveLength(1);
    expect(screen.getAllByText('Acme').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole('link', { name: 'Acme' })).toHaveAttribute(
      'href',
      '/companies/acme',
    );
    expect(
      screen.getByRole('heading', { name: 'About the company' }),
    ).toBeVisible();
    const companyProfileLink = screen.getByRole('link', {
      name: 'View company profile',
    });
    expect(companyProfileLink.tagName).toBe('A');
    expect(companyProfileLink).toHaveAttribute('href', '/companies/acme');
    const companyFooter = companyProfileLink.closest(
      '[data-slot="card-footer"]',
    );
    expect(companyFooter).not.toBeNull();
    expect(
      screen.queryByRole('button', { name: 'View company profile' }),
    ).toBeNull();
    expect(
      screen.getByText('Acme builds tools for modern product teams.'),
    ).toBeVisible();
    expect(screen.queryByRole('link', { name: 'acme.example' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'View full job' })).toBeNull();
    expect(
      screen
        .getByRole('link', { name: 'Design' })
        .closest('[data-slot="badge"]'),
    ).not.toBeNull();
    expect(
      screen
        .getByRole('link', { name: 'Figma' })
        .closest('[data-slot="badge"]'),
    ).not.toBeNull();
  });

  it('states when the API omitted the description', async () => {
    renderDetail(
      <JobSearchResultDetail vm={{ ...vm, descriptionHtml: null }} />,
    );

    expect(await screen.findByText('No description provided.')).toBeVisible();
  });

  it('uses the loaded detail slots and skeleton-only actions while a job changes', async () => {
    const { container, unmount } = renderDetail(
      <JobSearchResultDetail
        vm={vm}
        loading
        applySlot={<button>Apply</button>}
        saveSlot={<button>Save</button>}
      />,
    );

    expect(await screen.findByRole('status')).toHaveTextContent('Loading');
    expect(
      container.querySelector('[data-slot="job-detail-header-loading"]'),
    ).toBeInTheDocument();
    expect(
      container.querySelector('[data-slot="job-detail-loading-body"]'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Apply' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
    expect(
      container.querySelector('[data-slot="job-detail-apply-action-skeleton"]'),
    ).toBeInTheDocument();
    expect(
      container.querySelector('[data-slot="job-detail-save-action-skeleton"]'),
    ).toBeInTheDocument();

    const structuralSlots = [
      'job-detail-company-row',
      'job-detail-title-row',
      'job-detail-location-row',
      'job-detail-badges',
    ];
    for (const slot of structuralSlots) {
      expect(
        container.querySelector(`[data-slot="${slot}"]`),
      ).toBeInTheDocument();
    }
    expect(
      container.querySelector('[data-slot="job-detail-body-prose-skeleton"]'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Product designer')).not.toBeInTheDocument();
    expect(container.querySelector('article')).toHaveAttribute(
      'aria-busy',
      'true',
    );

    unmount();
    const loaded = renderDetail(
      <JobSearchResultDetail
        vm={vm}
        applySlot={<button>Apply</button>}
        saveSlot={<button>Save</button>}
      />,
    );
    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'Product designer',
      }),
    ).toBeVisible();
    for (const slot of structuralSlots) {
      expect(
        loaded.container.querySelector(`[data-slot="${slot}"]`),
      ).toBeInTheDocument();
    }
  });

  it('replaces the expanded hero once its boundary leaves the detail viewport', async () => {
    const { container } = renderDetail(
      <SearchResultDetail label="Selected job">
        <JobSearchResultDetail
          vm={vm}
          applySlot={<button>Apply</button>}
          saveSlot={<button>Save</button>}
        />
      </SearchResultDetail>,
    );
    const detail = await screen.findByRole('region', { name: 'Selected job' });
    const expanded = container.querySelector<HTMLElement>(
      '[data-slot="detail-expanded-header"]',
    );
    const boundary = container.querySelector<HTMLElement>(
      '[data-slot="detail-hero-boundary"]',
    );
    if (!expanded || !boundary) throw new Error('Job hero was not rendered');

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

    // The condensed swap is batched into a requestAnimationFrame so scroll
    // handlers do not thrash style→layout→style, so it is NOT applied by the
    // time fireEvent returns. Wait for the frame rather than asserting into
    // the gap.
    await waitFor(() =>
      expect(
        container.querySelector("[data-slot='search-detail-header']"),
      ).not.toBeNull(),
    );

    const compact = container.querySelector<HTMLElement>(
      '[data-slot="search-detail-header"]',
    );
    expect(compact).toBeInTheDocument();
    if (!compact) throw new Error('Expected the compact detail header');
    expect(expanded).toHaveAttribute('aria-hidden', 'true');
    // The condensed header's name links to the job's own detail page.
    const compactName = within(compact).getByRole('link', {
      name: 'Product designer',
    });
    expect(compactName).toHaveAttribute(
      'href',
      '/companies/acme/jobs/product-designer',
    );
    expect(
      within(compact).getByRole('button', { name: 'Apply' }),
    ).toBeVisible();
    expect(within(compact).getByRole('button', { name: 'Save' })).toBeVisible();
  });
});
