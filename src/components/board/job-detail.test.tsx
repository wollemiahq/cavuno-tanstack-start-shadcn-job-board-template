// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { JobDetail } from './job-detail';

import {
  EMPTY_DETAIL_FIELDS,
  type DetailFieldZones,
} from '@/board/detail-fields';
import type { JobDetailVM } from '@/board/job-detail-view-model';

const detailFields: DetailFieldZones = {
  ...EMPTY_DETAIL_FIELDS,
  facts: [
    {
      key: 'clearance',
      label: 'Clearance required',
      value: { kind: 'text', text: 'Yes' },
    },
  ],
  prose: [
    {
      key: 'about_team',
      label: 'About the team',
      value: { kind: 'html', html: '<p><strong>Small</strong> and calm.</p>' },
    },
  ],
  compactCollections: [
    {
      key: 'stack',
      label: 'Tech stack',
      entries: [
        {
          id: 'ts',
          title: 'TypeScript',
          logoUrl: 'https://cdn.test/ts.png',
          description: null,
          details: [],
          rows: [],
        },
      ],
    },
  ],
  richCollections: [
    {
      key: 'benefits',
      label: 'Benefits',
      entries: [
        {
          id: 'leave',
          title: 'Extra leave',
          logoUrl: null,
          description: { kind: 'text', text: 'Five more days.' },
          details: [
            {
              key: 'days',
              label: 'Days per year',
              value: { kind: 'text', text: '5' },
            },
          ],
          rows: [],
        },
      ],
    },
  ],
  documents: [
    {
      key: 'handbook',
      label: 'Handbook',
      files: [
        {
          url: 'https://cdn.test/handbook.pdf',
          name: 'handbook.pdf',
          sizeLabel: null,
        },
      ],
    },
  ],
};

const vm: JobDetailVM = {
  breadcrumbs: [],
  breadcrumbAriaLabel: 'Breadcrumbs',
  title: 'Product designer',
  companyName: 'Acme',
  companyLogoUrl: null,
  companyAvatarName: 'Acme',
  sector: null,
  locationLabel: 'Sydney',
  workplaceLabel: null,
  employmentTypeLabel: null,
  seniorityLabel: null,
  salaryLabel: null,
  publishedLabel: null,
  canonicalUrl: null,
  detailHref: null,
  descriptionHtml: '<p>Design products.</p>',
  noDescriptionText: 'No description.',
  facts: [{ label: 'Experience', value: '3+ years' }],
  categoryChips: [],
  skillChips: [],
  categoriesHeading: 'Categories',
  skillsHeading: 'Skills',
  customFields: [],
  additionalDetailsHeading: 'Additional details',
  detailFields,
  documentsHeading: 'Documents',
  company: null,
  similar: [],
  similarJobsHeading: 'Similar jobs',
};

afterEach(cleanup);

describe('JobDetail operator fields', () => {
  it('places each field in its size-class zone', () => {
    const { container } = render(<JobDetail vm={vm} />);
    const article = container.querySelector('article')!;

    // Prose: its own section with the label as heading, HTML rendered.
    const about = within(article).getByRole('region', {
      name: 'About the team',
    });
    expect(
      within(about).getByRole('heading', { name: 'About the team' }),
    ).toBeInTheDocument();
    expect(within(about).getByText('Small').tagName).toBe('STRONG');

    // Facts: the custom fact joins the built-in facts list, after them.
    const facts = within(article).getByText('Experience').closest('dl')!;
    const terms = within(facts)
      .getAllByRole('term')
      .map((term) => term.textContent);
    expect(terms).toEqual(['Experience', 'Clearance required']);

    // Compact collection: chips under the field label.
    const stack = within(article).getByRole('region', { name: 'Tech stack' });
    expect(within(stack).getByText('TypeScript')).toBeInTheDocument();

    // Rich collection: a card with its title, description and details.
    const benefits = within(article).getByRole('region', { name: 'Benefits' });
    expect(
      within(benefits).getByRole('heading', { name: 'Extra leave' }),
    ).toBeInTheDocument();
    expect(within(benefits).getByText('Five more days.')).toBeInTheDocument();
    expect(within(benefits).getByText('Days per year')).toBeInTheDocument();

    // Files: a Documents list in the rail, not the main column.
    const handbook = screen.getByRole('link', { name: 'handbook.pdf' });
    expect(handbook).toHaveAttribute('href', 'https://cdn.test/handbook.pdf');
    expect(article).not.toContainElement(handbook);
  });

  it('replaces the single Additional details list with the zones', () => {
    render(
      <JobDetail
        vm={{
          ...vm,
          customFields: [
            { key: 'clearance', label: 'Clearance required', value: 'Yes' },
          ],
        }}
      />,
    );
    expect(
      screen.queryByRole('heading', { name: 'Additional details' }),
    ).toBeNull();
    expect(screen.getAllByText('Clearance required')).toHaveLength(1);
  });

  it('renders no headings for empty zones', () => {
    render(<JobDetail vm={{ ...vm, detailFields: EMPTY_DETAIL_FIELDS }} />);
    expect(screen.queryByRole('heading', { name: 'Documents' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Benefits' })).toBeNull();
    expect(
      screen.queryByRole('heading', { name: 'About the team' }),
    ).toBeNull();
  });
});
