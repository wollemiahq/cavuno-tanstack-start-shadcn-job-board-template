// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CopyLinkButton } from './copy-link-button';
import { JobDetail } from './job-detail';

import type { JobDetailVM } from '@/board/job-detail-view-model';

const vm: JobDetailVM = {
  breadcrumbs: [],
  breadcrumbAriaLabel: 'Breadcrumbs',
  title: 'Product designer',
  companyName: 'Acme',
  companyLogoUrl: null,
  companyAvatarName: 'Acme',
  sector: null,
  locationLabel: 'Sydney',
  workplaceLabel: 'On-site',
  employmentTypeLabel: null,
  seniorityLabel: null,
  salaryLabel: null,
  publishedLabel: null,
  canonicalUrl: null,
  detailHref: '/companies/acme/jobs/product-designer',
  descriptionHtml: '<p>Design products.</p>',
  noDescriptionText: 'No description.',
  facts: [],
  categoryChips: [],
  skillChips: [],
  categoriesHeading: 'Categories',
  skillsHeading: 'Skills',
  customFields: [],
  additionalDetailsHeading: 'Additional details',
  company: null,
  similar: [],
  similarJobsHeading: 'Similar jobs',
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('JobDetail actions', () => {
  it('groups Apply, Save, and Copy link in one actions region', () => {
    const { container } = render(
      <JobDetail
        vm={vm}
        applySlot={<button>Apply</button>}
        secondaryActions={
          <>
            <button>Save job</button>
            <CopyLinkButton url="https://board.test/jobs/x" language="en" />
          </>
        }
      />,
    );

    const actions = container.querySelector("[data-slot='job-actions']");
    expect(actions).toBeInTheDocument();
    for (const name of ['Apply', 'Save job', 'copy link']) {
      expect(actions).toContainElement(screen.getByRole('button', { name }));
    }
    // Save + Copy sit in the two-up row beneath the full-width Apply.
    expect(actions?.querySelector('.grid.grid-cols-2')).not.toBeNull();
  });

  it('renders the alert signup slot in the sidebar, not the prose column', () => {
    const { container } = render(
      <JobDetail
        vm={vm}
        alertSlot={<div data-testid="alerts">Get alerts</div>}
      />,
    );
    // The alert card lives in the rail; the main <article> carries only the
    // description/facts/taxonomy content now.
    const article = container.querySelector('article');
    expect(article).not.toContainElement(screen.getByTestId('alerts'));
  });

  it('the copy-link action writes the canonical URL to the clipboard', async () => {
    const writeText = vi
      .fn<(value: string) => Promise<void>>()
      .mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    render(
      <JobDetail
        vm={vm}
        secondaryActions={
          <CopyLinkButton
            url="https://board.test/companies/acme/jobs/product-designer"
            language="en"
          />
        }
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'copy link' }));

    expect(writeText).toHaveBeenCalledWith(
      'https://board.test/companies/acme/jobs/product-designer',
    );
    expect(await screen.findByText('Copied')).toBeInTheDocument();
  });
});
