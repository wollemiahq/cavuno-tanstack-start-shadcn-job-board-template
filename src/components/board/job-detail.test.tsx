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
  tileCollections: [
    {
      key: 'stack',
      label: 'Tech stack',
      entries: [
        {
          id: 'ts',
          title: 'TypeScript',
          logoUrl: 'https://cdn.test/ts.png',
          description: null,
        },
        { id: 'go', title: 'Go', logoUrl: null, description: null },
      ],
      groups: null,
    },
  ],
  chipCollections: [
    {
      key: 'practices',
      label: 'Workplace practices',
      entries: [
        {
          id: 'async',
          title: 'Async first',
          logoUrl: null,
          description: null,
        },
      ],
      groups: null,
    },
  ],
  listCollections: [
    {
      key: 'benefits',
      label: 'Benefits',
      entries: [
        {
          id: 'leave',
          title: 'Extra leave',
          logoUrl: null,
          description: { kind: 'text', text: 'Five more days.' },
        },
        {
          id: 'remote',
          title: 'Remote budget',
          logoUrl: null,
          description: {
            kind: 'html',
            html: '<p>For a <strong>desk</strong>.</p>',
          },
        },
      ],
      groups: null,
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

    // Tile collection: a tile per entry under the field label; an entry
    // without a logo gets the same tile with its initial instead.
    const stack = within(article).getByRole('region', { name: 'Tech stack' });
    const [typescript, go] = within(stack).getAllByRole('listitem');
    expect(typescript).toHaveTextContent('TypeScript');
    expect(typescript!.querySelector('img')).toHaveAttribute(
      'src',
      'https://cdn.test/ts.png',
    );
    expect(go).toHaveTextContent('Go');
    expect(go!.querySelector('img')).toBeNull();
    expect(within(go!).getByText('G')).toBeInTheDocument();

    // Chip collection: chips under the field label.
    const practices = within(article).getByRole('region', {
      name: 'Workplace practices',
    });
    expect(within(practices).getByText('Async first')).toBeInTheDocument();

    // List collection: a list of titles and descriptions; sanitised HTML
    // descriptions render as HTML.
    const benefits = within(article).getByRole('region', { name: 'Benefits' });
    expect(within(benefits).getAllByRole('listitem')).toHaveLength(2);
    expect(within(benefits).getByText('Extra leave')).toBeInTheDocument();
    expect(within(benefits).getByText('Five more days.')).toBeInTheDocument();
    expect(within(benefits).getByText('desk').tagName).toBe('STRONG');
    // Short collections have nothing to expand.
    expect(within(benefits).queryByRole('button')).toBeNull();

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

  it('previews six list entries and twelve tiles or chips, and expands in place', () => {
    const entries = (prefix: string, count: number, described: boolean) =>
      Array.from({ length: count }, (_, index) => ({
        id: `${prefix}-${index}`,
        title: `${prefix} ${index}`,
        logoUrl: null,
        description: described
          ? { kind: 'text' as const, text: `About ${prefix} ${index}` }
          : null,
      }));
    render(
      <JobDetail
        vm={{
          ...vm,
          detailFields: {
            ...EMPTY_DETAIL_FIELDS,
            listCollections: [
              {
                key: 'perks',
                label: 'Perks',
                entries: entries('Perk', 8, true),
                groups: null,
              },
            ],
            tileCollections: [
              {
                key: 'stack',
                label: 'Stack',
                entries: entries('Tech', 14, false).map((entry, index) => ({
                  ...entry,
                  logoUrl: index === 0 ? 'https://cdn.test/tech.png' : null,
                })),
                groups: null,
              },
            ],
            chipCollections: [
              {
                key: 'tools',
                label: 'Tools',
                entries: entries('Tool', 15, false),
                groups: null,
              },
            ],
          },
        }}
      />,
    );

    const perks = screen.getByRole('region', { name: 'Perks' });
    expect(within(perks).getAllByRole('listitem')).toHaveLength(6);
    const showAll = within(perks).getByRole('button', { expanded: false });
    expect(showAll).toHaveTextContent('8');
    fireEvent.click(showAll);
    expect(within(perks).getAllByRole('listitem')).toHaveLength(8);
    expect(within(perks).getByText('About Perk 7')).toBeVisible();
    const showFewer = within(perks).getByRole('button', { expanded: true });
    expect(
      document.getElementById(showFewer.getAttribute('aria-controls')!),
    ).toContainElement(within(perks).getByRole('list'));
    fireEvent.click(showFewer);
    expect(within(perks).getAllByRole('listitem')).toHaveLength(6);

    const stack = screen.getByRole('region', { name: 'Stack' });
    expect(within(stack).getAllByRole('listitem')).toHaveLength(12);
    fireEvent.click(within(stack).getByRole('button', { expanded: false }));
    expect(within(stack).getAllByRole('listitem')).toHaveLength(14);
    expect(within(stack).getByText('Tech 13')).toBeVisible();

    const tools = screen.getByRole('region', { name: 'Tools' });
    expect(within(tools).getAllByRole('listitem')).toHaveLength(12);
    fireEvent.click(within(tools).getByRole('button', { expanded: false }));
    expect(within(tools).getAllByRole('listitem')).toHaveLength(15);
  });

  it.each(['chipCollections', 'tileCollections'] as const)(
    'groups the expanded view of %s under subheadings, keeping the preview flat',
    (zone) => {
      const tool = (id: string) => ({
        id,
        title: id,
        logoUrl: null,
        description: null,
      });
      const tools = Array.from({ length: 14 }, (_, index) =>
        tool(`Tool ${index}`),
      );
      render(
        <JobDetail
          vm={{
            ...vm,
            detailFields: {
              ...EMPTY_DETAIL_FIELDS,
              [zone]: [
                {
                  key: 'stack',
                  label: 'Tech stack',
                  entries: tools,
                  groups: [
                    {
                      key: 'category:fe',
                      label: 'Frontend',
                      entries: tools.slice(0, 10),
                    },
                    { key: 'other', label: 'Other', entries: tools.slice(10) },
                  ],
                },
              ],
            },
          }}
        />,
      );

      const stack = screen.getByRole('region', { name: 'Tech stack' });
      expect(within(stack).queryByRole('heading', { level: 3 })).toBeNull();
      expect(within(stack).getAllByRole('listitem')).toHaveLength(12);

      fireEvent.click(within(stack).getByRole('button', { expanded: false }));
      const headings = within(stack).getAllByRole('heading', { level: 3 });
      expect(headings.map((heading) => heading.textContent)).toEqual([
        'Frontend',
        'Other',
      ]);
      const lists = within(stack).getAllByRole('list');
      expect(
        lists.map((list) => within(list).getAllByRole('listitem').length),
      ).toEqual([10, 4]);

      fireEvent.click(within(stack).getByRole('button', { expanded: true }));
      expect(within(stack).queryByRole('heading', { level: 3 })).toBeNull();
      expect(within(stack).getAllByRole('listitem')).toHaveLength(12);
    },
  );

  it('renders no headings for empty zones', () => {
    render(<JobDetail vm={{ ...vm, detailFields: EMPTY_DETAIL_FIELDS }} />);
    expect(screen.queryByRole('heading', { name: 'Documents' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Benefits' })).toBeNull();
    expect(
      screen.queryByRole('heading', { name: 'About the team' }),
    ).toBeNull();
  });
});
