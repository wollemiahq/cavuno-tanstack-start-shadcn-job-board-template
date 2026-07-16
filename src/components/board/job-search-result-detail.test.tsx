// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
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
  locationLabel: 'Sydney, NSW',
  workplaceLabel: 'On-site',
  employmentTypeLabel: 'Full time',
  seniorityLabel: 'Senior',
  salaryLabel: '$140k–$170k',
  publishedLabel: 'Posted 2d ago',
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
  },
  similar: [],
  similarJobsHeading: 'Similar jobs',
};

afterEach(cleanup);

describe('JobSearchResultDetail', () => {
  it('is decision-complete without importing full-page SEO composition', () => {
    render(
      <JobSearchResultDetail
        vm={vm}
        applySlot={<button>Apply</button>}
        saveSlot={<button>Save</button>}
      />,
    );

    expect(
      screen.getByRole('heading', { level: 2, name: 'Product designer' }),
    ).toBeVisible();
    expect(screen.getByText('$140k–$170k')).toBeVisible();
    expect(
      screen.getByText('$140k–$170k').closest('[data-slot="badge"]'),
    ).not.toBeNull();
    expect(screen.getByText('On-site')).toBeVisible();
    expect(screen.getByText(/Sydney, NSW/)).toBeVisible();
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
    const primaryActions = document.querySelector(
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
    expect(
      within(primaryActions as HTMLElement).getByTestId(
        'job-detail-apply-action',
      ),
    ).toContainElement(screen.getByRole('button', { name: 'Apply' }));
    expect(
      within(primaryActions as HTMLElement).getByTestId(
        'job-detail-save-action',
      ),
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

  it('states when the API omitted the description', () => {
    render(<JobSearchResultDetail vm={{ ...vm, descriptionHtml: null }} />);

    expect(screen.getByText('No description provided.')).toBeVisible();
  });

  it('uses the loaded detail slots and skeleton-only actions while a job changes', () => {
    const { container, rerender } = render(
      <JobSearchResultDetail
        vm={vm}
        loading
        applySlot={<button>Apply</button>}
        saveSlot={<button>Save</button>}
      />,
    );

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
    expect(screen.getByRole('status')).toHaveTextContent('Loading');

    rerender(
      <JobSearchResultDetail
        vm={vm}
        applySlot={<button>Apply</button>}
        saveSlot={<button>Save</button>}
      />,
    );
    for (const slot of structuralSlots) {
      expect(
        container.querySelector(`[data-slot="${slot}"]`),
      ).toBeInTheDocument();
    }
  });

  it('replaces the expanded hero once its boundary leaves the detail viewport', () => {
    const { container } = render(
      <SearchResultDetail label="Selected job">
        <JobSearchResultDetail
          vm={vm}
          applySlot={<button>Apply</button>}
          saveSlot={<button>Save</button>}
        />
      </SearchResultDetail>,
    );
    const detail = screen.getByRole('region', { name: 'Selected job' });
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

    const compact = container.querySelector(
      '[data-slot="job-detail-compact-header"]',
    );
    expect(compact).toBeInTheDocument();
    expect(expanded).toHaveAttribute('aria-hidden', 'true');
    expect(
      within(compact as HTMLElement).getByText('Product designer'),
    ).toBeVisible();
    expect(
      within(compact as HTMLElement).getByRole('button', { name: 'Apply' }),
    ).toBeVisible();
    expect(
      within(compact as HTMLElement).getByRole('button', { name: 'Save' }),
    ).toBeVisible();
  });
});
