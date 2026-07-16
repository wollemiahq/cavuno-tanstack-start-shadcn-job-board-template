// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

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

afterEach(cleanup);

describe('JobDetail actions', () => {
  it('keeps Apply and Save in one actions region', () => {
    const { container } = render(
      <JobDetail
        vm={vm}
        applySlot={<button>Apply</button>}
        secondaryActions={<button>Save</button>}
      />,
    );

    const actions = container.querySelector("[data-slot='job-actions']");
    expect(actions).toBeInTheDocument();
    expect(actions).toContainElement(
      screen.getByRole('button', { name: 'Apply' }),
    );
    expect(actions).toContainElement(
      screen.getByRole('button', { name: 'Save' }),
    );
  });
});
