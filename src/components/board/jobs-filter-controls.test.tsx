// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { SENIORITIES } from '@cavuno/board/filters';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { JobsFilterControls } from './jobs-filter-controls';

import type { CustomFilterField } from '@/lib/custom-field-filters';
import { m } from '@/paraglide/messages';
import { containing } from '@/test/text';

afterEach(cleanup);

/** Matches an accessible name that contains the catalog label. */

const customFields: CustomFilterField[] = [
  {
    kind: 'choice',
    key: 'work_style',
    label: 'Work style',
    options: [
      { value: 'async', label: 'Async-first' },
      { value: 'sync', label: 'Office hours' },
    ],
  },
  { kind: 'flag', key: 'four_day_week', label: 'Four-day week' },
];

/** A board with one custom employment type offered and one retired. */
const jobForm = {
  jobForm: {
    employmentType: {
      allowedOptions: ['contract', 'full_time'],
      customTypes: [
        {
          key: 'casual',
          label: 'Casual',
          employmentType: 'part_time',
          offered: true,
        },
        {
          key: 'fifo',
          label: 'Fly-in fly-out',
          employmentType: 'contract',
          offered: false,
        },
      ],
      order: ['contract', 'casual', 'full_time', 'fifo'],
    },
  },
};

describe('JobsFilterControls', () => {
  it('shows the current sort and updates the listing selection', () => {
    const onChange = vi.fn();

    render(
      <JobsFilterControls
        filters={{ sort: 'relevance' }}
        language="en"
        onChange={onChange}
      />,
    );

    const sort = screen.getByRole('combobox', {
      name: m.jobSearch_sortPlaceholder(),
    });
    expect(sort).toHaveTextContent(`${m.jobSearch_sortPlaceholder()}:`);
    expect(sort).toHaveTextContent(m.jobCard_aiRankedLabel());

    fireEvent.click(sort);
    expect(
      screen.getByRole('option', { name: m.jobCard_aiRankedLabel() }),
    ).toHaveAttribute('aria-selected', 'true');

    const dateOption = screen.getByRole('option', {
      name: m.jobCard_sortNewestLabel(),
    });
    fireEvent.pointerDown(dateOption, { pointerType: 'mouse' });
    fireEvent.click(dateOption);

    expect(onChange).toHaveBeenCalledWith({ sort: 'newest' });
  });

  it('adds job custom fields to All filters and writes them to the URL', () => {
    const onChange = vi.fn();
    const filters = { q: 'design', 'cf.work_style': 'sync' };

    render(
      <JobsFilterControls
        filters={filters}
        customFilters={{
          fields: customFields,
          active: [{ key: 'work_style', values: ['sync'] }],
        }}
        language="en"
        onChange={onChange}
      />,
    );

    const trigger = screen.getByRole('button', {
      name: containing(m.jobSearch_allFiltersLabel()),
    });
    expect(trigger).toHaveTextContent('1');
    fireEvent.click(trigger);
    const sheet = screen.getByRole('dialog', {
      name: m.jobSearch_allFiltersLabel(),
    });
    expect(sheet).toHaveAccessibleDescription(
      m.jobSearch_filterSheetDescriptionWithCustomFields(),
    );
    const workStyle = within(sheet).getByRole('group', { name: 'Work style' });
    expect(
      within(workStyle).getByRole('checkbox', { name: 'Office hours' }),
    ).toBeChecked();

    fireEvent.click(
      within(workStyle).getByRole('checkbox', { name: 'Async-first' }),
    );
    fireEvent.click(
      within(sheet).getByRole('checkbox', { name: 'Four-day week' }),
    );
    fireEvent.click(
      within(sheet).getByRole('button', {
        name: m.jobSearch_applyFiltersLabel(),
      }),
    );

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        q: 'design',
        'cf.work_style': 'async,sync',
        'cf.four_day_week': true,
      }),
    );
  });

  it('clears custom-field filters with the other filters on Reset', () => {
    const onChange = vi.fn();
    const filters = {
      remoteOption: 'remote' as const,
      'cf.four_day_week': true as const,
    };

    render(
      <JobsFilterControls
        filters={filters}
        customFilters={{
          fields: customFields,
          active: [{ key: 'four_day_week', values: [true] }],
        }}
        language="en"
        onChange={onChange}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: m.jobSearch_resetLabel() }),
    );

    const next = onChange.mock.calls[0]?.[0];
    expect(next).toMatchObject({ remoteOption: undefined });
    expect(next['cf.four_day_week']).toBeUndefined();
  });

  it('shows no custom section when the board has no filterable fields', () => {
    render(
      <JobsFilterControls
        filters={{}}
        customFilters={{ fields: [], active: [] }}
        language="en"
        onChange={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: containing(m.jobSearch_allFiltersLabel()),
      }),
    );
    const sheet = screen.getByRole('dialog', {
      name: m.jobSearch_allFiltersLabel(),
    });
    expect(sheet).toHaveAccessibleDescription(
      m.jobSearch_filterSheetDescription(),
    );
    // Only the built-in seniority checkboxes remain.
    expect(within(sheet).getAllByRole('checkbox')).toHaveLength(
      SENIORITIES.length,
    );
  });

  it("offers the board's employment types in its order and filters by a custom one", () => {
    const onChange = vi.fn();

    render(
      <JobsFilterControls
        filters={{ q: 'barista' }}
        jobForm={jobForm}
        language="en"
        onChange={onChange}
      />,
    );

    fireEvent.click(
      screen.getByRole('combobox', { name: m.jobSearch_typePlaceholder() }),
    );
    expect(
      screen.getAllByRole('option').map((option) => option.textContent),
    ).toEqual([
      m.jobSearch_anyTypeLabel(),
      m.label_employmentContract(),
      'Casual',
      m.label_employmentFullTime(),
    ]);

    const casual = screen.getByRole('option', { name: 'Casual' });
    fireEvent.pointerDown(casual, { pointerType: 'mouse' });
    fireEvent.click(casual);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        q: 'barista',
        employmentType: undefined,
        customEmploymentType: 'casual',
      }),
    );
  });

  it('shows the active custom employment type and swaps it for a built-in', () => {
    const onChange = vi.fn();

    render(
      <JobsFilterControls
        filters={{ customEmploymentType: 'casual' }}
        jobForm={jobForm}
        language="en"
        onChange={onChange}
      />,
    );

    const type = screen.getByRole('combobox', {
      name: m.jobSearch_typePlaceholder(),
    });
    expect(type).toHaveTextContent('Casual');

    fireEvent.click(type);
    const contract = screen.getByRole('option', {
      name: m.label_employmentContract(),
    });
    fireEvent.pointerDown(contract, { pointerType: 'mouse' });
    fireEvent.click(contract);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        employmentType: 'contract',
        customEmploymentType: undefined,
      }),
    );
  });

  it('keeps a custom type the board no longer offers visible and clearable', () => {
    const onChange = vi.fn();

    render(
      <JobsFilterControls
        filters={{ customEmploymentType: 'fifo' }}
        jobForm={jobForm}
        language="en"
        onChange={onChange}
      />,
    );

    const type = screen.getByRole('combobox', {
      name: m.jobSearch_typePlaceholder(),
    });
    expect(type).toHaveTextContent('Fly-in fly-out');

    fireEvent.click(type);
    expect(
      screen.getAllByRole('option').map((option) => option.textContent),
    ).toEqual([
      m.jobSearch_anyTypeLabel(),
      m.label_employmentContract(),
      'Casual',
      m.label_employmentFullTime(),
      'Fly-in fly-out',
    ]);
    const any = screen.getByRole('option', {
      name: m.jobSearch_anyTypeLabel(),
    });
    fireEvent.pointerDown(any, { pointerType: 'mouse' });
    fireEvent.click(any);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        employmentType: undefined,
        customEmploymentType: undefined,
      }),
    );
  });

  it('labels an unknown custom key and a built-in the board disallows', () => {
    const { unmount } = render(
      <JobsFilterControls
        filters={{ customEmploymentType: 'seasonal' }}
        jobForm={jobForm}
        language="en"
        onChange={vi.fn()}
      />,
    );
    expect(
      screen.getByRole('combobox', { name: m.jobSearch_typePlaceholder() }),
    ).toHaveTextContent('seasonal');
    unmount();

    render(
      <JobsFilterControls
        filters={{ employmentType: 'internship' }}
        jobForm={jobForm}
        language="en"
        onChange={vi.fn()}
      />,
    );
    const type = screen.getByRole('combobox', {
      name: m.jobSearch_typePlaceholder(),
    });
    expect(type).toHaveTextContent(m.label_employmentInternship());
    fireEvent.click(type);
    expect(
      screen.getByRole('option', { name: m.label_employmentInternship() }),
    ).toHaveAttribute('aria-selected', 'true');
  });
});
