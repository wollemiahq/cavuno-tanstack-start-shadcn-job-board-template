// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { JobsFilterControls } from './jobs-filter-controls';

afterEach(cleanup);

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
});
