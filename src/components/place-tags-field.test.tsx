// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  cleanup,
  createEvent,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PlaceTagsField } from './place-tags-field';

import type { LocationSuggestionVM } from '@/board/location-suggestion';

afterEach(cleanup);

const london: LocationSuggestionVM = {
  id: 'p1',
  slug: 'london',
  name: 'London',
  contextLabel: 'United Kingdom',
  countryCode: 'GB',
  regionCode: null,
};

function type(value: string) {
  const input = screen.getByRole('combobox');
  fireEvent.input(input, { target: { value }, inputType: 'insertText' });
  return input;
}

describe('PlaceTagsField — async place search', () => {
  it('keeps the popup open with a searching status while places are loading', () => {
    const onQueryChange = vi.fn();
    render(
      <PlaceTagsField
        id="job-office-locations"
        tags={[]}
        suggestions={[]}
        loading
        onQueryChange={onQueryChange}
        onAddSuggestion={() => {}}
        onRemove={() => {}}
        searchingText="Searching…"
        removeAriaLabel={(name) => `Remove ${name}`}
      />,
    );

    type('Lon');

    expect(onQueryChange).toHaveBeenCalledWith('Lon');
    expect(screen.getByText('Searching…')).toBeInTheDocument();
  });

  it('shows resolved places once they arrive', () => {
    const { rerender } = render(
      <PlaceTagsField
        id="job-office-locations"
        tags={[]}
        suggestions={[]}
        loading
        onQueryChange={() => {}}
        onAddSuggestion={() => {}}
        onRemove={() => {}}
        searchingText="Searching…"
        removeAriaLabel={(name) => `Remove ${name}`}
      />,
    );

    type('Lon');

    rerender(
      <PlaceTagsField
        id="job-office-locations"
        tags={[]}
        suggestions={[london]}
        loading={false}
        onQueryChange={() => {}}
        onAddSuggestion={() => {}}
        onRemove={() => {}}
        searchingText="Searching…"
        removeAriaLabel={(name) => `Remove ${name}`}
      />,
    );

    expect(screen.getByRole('option', { name: /London/ })).toBeInTheDocument();
  });

  it('keeps the popup mounted after two characters before the first request resolves', () => {
    render(
      <PlaceTagsField
        id="job-office-locations"
        tags={[]}
        suggestions={[]}
        loading={false}
        onQueryChange={() => {}}
        onAddSuggestion={() => {}}
        onRemove={() => {}}
        searchingText="Searching…"
        removeAriaLabel={(name) => `Remove ${name}`}
      />,
    );

    type('Lon');

    expect(
      document.querySelector('[data-slot="combobox-content"]'),
    ).not.toBeNull();
  });

  it('adds nothing for typed text without a pick, and Enter never submits the form', () => {
    const onAddSuggestion = vi.fn();
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <PlaceTagsField
          id="job-office-locations"
          tags={[]}
          suggestions={[]}
          loading={false}
          onQueryChange={() => {}}
          onAddSuggestion={onAddSuggestion}
          onRemove={() => {}}
          searchingText="Searching…"
          removeAriaLabel={(name) => `Remove ${name}`}
        />
      </form>,
    );

    const input = type('Atlantis');
    const enter = createEvent.keyDown(input, { key: 'Enter' });
    fireEvent(input, enter);

    expect(enter.defaultPrevented).toBe(true);
    expect(onAddSuggestion).not.toHaveBeenCalled();
    expect(screen.queryByRole('listitem')).toBeNull();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('commits a picked place and ends the search session', () => {
    const onAddSuggestion = vi.fn();
    const onPicked = vi.fn();
    render(
      <PlaceTagsField
        id="job-office-locations"
        tags={[]}
        suggestions={[london]}
        loading={false}
        onQueryChange={() => {}}
        onPicked={onPicked}
        onAddSuggestion={onAddSuggestion}
        onRemove={() => {}}
        searchingText="Searching…"
        removeAriaLabel={(name) => `Remove ${name}`}
      />,
    );

    type('Lon');
    fireEvent.click(screen.getByRole('option', { name: /London/ }));

    expect(onAddSuggestion).toHaveBeenCalledWith(london);
    expect(onPicked).toHaveBeenCalledTimes(1);
  });
});
