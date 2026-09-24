// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { CompanyOverview } from './-company-overview';
import { publicCompanyFixture } from './-route-test-fixtures';

import { renderRouted } from '@/test/render-routed';
import type { BoardProfileFormField, PublicCompanyDetail } from '@cavuno/board';

type Selection = PublicCompanyDetail['objectReferences'][number];

function custom(
  key: string,
  label: string,
  type: 'long_text' | 'number' | 'short_text',
  visible = true,
): BoardProfileFormField {
  return {
    kind: 'custom',
    key,
    visible,
    required: false,
    definition: {
      key,
      label,
      type,
      required: false,
      visibility: 'public',
      editableByOwner: true,
    },
  };
}

function collection(
  key: string,
  label: string,
  descriptionFieldKey?: string,
): BoardProfileFormField {
  return {
    kind: 'collection',
    key,
    visible: true,
    required: false,
    definition: {
      key,
      label,
      typeId: `type-${key}`,
      multiple: true,
      visibility: 'public',
      editableByOwner: true,
      allowOverrides: false,
      descriptionFieldKey,
    },
  };
}

function selection(
  fieldKey: string,
  recordId: string,
  title: string,
  description?: string,
): Selection {
  return {
    fieldKey,
    fieldLabel: fieldKey,
    recordId,
    title,
    description,
    fields: [],
    attributes: {},
    valueDefinitions: [],
    entryDefinitions: [],
    values: {},
    entries: [],
  };
}

const technologies = Array.from({ length: 3 }, (_, index) =>
  selection('tech', `tech-${index}`, `Tech ${index}`),
);
const markets = Array.from({ length: 13 }, (_, index) =>
  selection('regions', `region-${index}`, `Region ${index}`),
);

const company: PublicCompanyDetail = {
  ...publicCompanyFixture('acme'),
  name: 'Acme',
  description: '<p>Builds rockets.</p>',
  customFieldValues: {
    headcount: 250,
    mission: 'Reach orbit.\nCheaply.',
    internal_code: 'X-1',
  },
  objectReferences: [
    selection('benefits', 'leave', 'Extra leave', 'Five more days.'),
    ...technologies,
    ...markets,
  ],
};

const formLayout: BoardProfileFormField[] = [
  custom('mission', 'Our mission', 'long_text'),
  custom('headcount', 'Headcount', 'number'),
  custom('internal_code', 'Internal code', 'short_text', false),
  collection('benefits', 'Benefits', 'summary'),
  collection('tech', 'Technologies'),
  collection('regions', 'Regions'),
];

afterEach(cleanup);

async function renderOverview() {
  return renderRouted(
    <CompanyOverview
      company={company}
      jobs={{
        object: 'list',
        url: '/companies/acme/jobs',
        data: [],
        hasMore: false,
        nextCursor: null,
      }}
      salarySummary={{ overallSalary: null, byCategory: [], currency: 'USD' }}
      hasSalaries={false}
      similar={Promise.resolve([])}
      board={{ forms: { company: formLayout } }}
    />,
  );
}

describe('CompanyOverview operator fields', () => {
  it('places custom fields and collections by size class', async () => {
    const { container } = await renderOverview();
    const rail = container.querySelector('aside')!;
    // SAFETY: the overview grid renders the main column immediately before
    // the rail, as an HTML <div>.
    const main = rail.previousElementSibling as HTMLElement;

    // Prose in the main column, under its label.
    const mission = within(main).getByRole('region', { name: 'Our mission' });
    expect(within(mission).getByText(/Reach orbit\./)).toBeInTheDocument();

    // Short facts in the rail facts block.
    expect(within(rail).getByText('Headcount')).toBeInTheDocument();
    expect(within(rail).getByText('250')).toBeInTheDocument();

    // A field the layout hides never renders.
    expect(screen.queryByText('Internal code')).toBeNull();
    expect(screen.queryByText('X-1')).toBeNull();

    // Rich collection: a card grid in the main column.
    const benefits = within(main).getByRole('region', { name: 'Benefits' });
    expect(
      within(benefits).getByRole('heading', { name: 'Extra leave' }),
    ).toBeInTheDocument();
    expect(within(benefits).getByText('Five more days.')).toBeInTheDocument();

    // Compact collections: chips in the main column whatever the number of
    // selections, never in the rail.
    const tech = within(main).getByRole('region', { name: 'Technologies' });
    expect(within(tech).getAllByRole('listitem')).toHaveLength(3);
    const regions = within(main).getByRole('region', { name: 'Regions' });
    expect(within(regions).getAllByRole('listitem')).toHaveLength(13);
    expect(within(rail).queryByText('Tech 0')).toBeNull();
    expect(within(rail).queryByText('Region 0')).toBeNull();
  });
});
