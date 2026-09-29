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

afterEach(cleanup);

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

    const sort = screen.getByRole('combobox', { name: 'Sort' });
    expect(sort).toHaveTextContent('Sort:');
    expect(sort).toHaveTextContent('Relevance');

    fireEvent.click(sort);
    expect(screen.getByRole('option', { name: 'Relevance' })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    const dateOption = screen.getByRole('option', { name: 'Date' });
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

    const trigger = screen.getByRole('button', { name: /All filters/ });
    expect(trigger).toHaveTextContent('1');
    fireEvent.click(trigger);
    const sheet = screen.getByRole('dialog', { name: 'All filters' });
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
      within(sheet).getByRole('button', { name: 'Apply filters' }),
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

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));

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

    fireEvent.click(screen.getByRole('button', { name: /All filters/ }));
    const sheet = screen.getByRole('dialog', { name: 'All filters' });
    expect(sheet).toHaveAccessibleDescription(
      m.jobSearch_filterSheetDescription(),
    );
    // Only the built-in seniority checkboxes remain.
    expect(within(sheet).getAllByRole('checkbox')).toHaveLength(
      SENIORITIES.length,
    );
  });
});
