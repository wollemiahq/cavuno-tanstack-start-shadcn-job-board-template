// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { useState } from 'react';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ListingSearchBand } from './listing-search-band';

afterEach(cleanup);

function SearchHarness({
  onSubmit = vi.fn<() => void>(),
}: {
  onSubmit?: () => void;
}) {
  const [value, setValue] = useState('designer');

  return (
    <ListingSearchBand
      value={value}
      onChange={setValue}
      onSubmit={onSubmit}
      placeholder="Search jobs"
      inputAriaLabel="Job keywords"
      searchLabel="Search"
    />
  );
}

describe('ListingSearchBand', () => {
  it('clears only the keyword and returns focus without submitting', () => {
    const onSubmit = vi.fn<() => void>();
    render(<SearchHarness onSubmit={onSubmit} />);

    const input = screen.getByRole('searchbox', { name: 'Job keywords' });
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));

    expect(input).toHaveValue('');
    expect(input).toHaveFocus();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits through the native search form', () => {
    const onSubmit = vi.fn<() => void>();
    render(<SearchHarness onSubmit={onSubmit} />);

    const input = screen.getByRole<HTMLInputElement>('searchbox', {
      name: 'Job keywords',
    });
    if (!input.form)
      throw new Error('Expected the search input to have a form');
    fireEvent.submit(input.form);

    expect(onSubmit).toHaveBeenCalledOnce();
  });
});
