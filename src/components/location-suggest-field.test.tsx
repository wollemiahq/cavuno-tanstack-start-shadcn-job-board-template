// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

import { LocationSuggestField } from './location-suggest-field';

import type { LocationSuggestionVM } from '@/board/location-suggestion';

afterEach(cleanup);
const lyon: LocationSuggestionVM = {
  id: 'lyon',
  slug: 'lyon',
  name: 'Lyon',
  fullName: 'Lyon, France',
  contextLabel: 'France',
  countryCode: 'FR',
  regionCode: null,
};

it('commits a profile/experience location only after retrieval succeeds', async () => {
  let finish!: (place: LocationSuggestionVM | null) => void;
  const onPick = vi.fn();
  render(
    <LocationSuggestField
      id="location"
      value="Lyo"
      onValueChange={() => {}}
      onPick={onPick}
      suggestions={[lyon]}
      loading={false}
      onQueryChange={() => {}}
      searchingText="Searching"
      resolvePick={() =>
        new Promise((resolve) => {
          finish = resolve;
        })
      }
    />,
  );
  fireEvent.focus(screen.getByRole('combobox'));
  fireEvent.click(screen.getByRole('option', { name: /Lyon/ }));
  expect(onPick).not.toHaveBeenCalled();
  await act(async () => {
    finish(lyon);
  });
  expect(onPick).toHaveBeenCalledWith(lyon);
});

it('does not overwrite newer profile/experience typing with a pending pick', async () => {
  let finish!: (place: LocationSuggestionVM | null) => void;
  const onPick = vi.fn();
  render(
    <LocationSuggestField
      id="location"
      value="Lyo"
      onValueChange={() => {}}
      onPick={onPick}
      suggestions={[lyon]}
      loading={false}
      onQueryChange={() => {}}
      searchingText="Searching"
      resolvePick={() =>
        new Promise((resolve) => {
          finish = resolve;
        })
      }
    />,
  );
  const input = screen.getByRole('combobox');
  fireEvent.focus(input);
  fireEvent.click(screen.getByRole('option', { name: /Lyon/ }));
  fireEvent.input(input, {
    target: { value: 'Paris' },
    inputType: 'insertText',
  });
  await act(async () => {
    finish(lyon);
  });
  expect(onPick).not.toHaveBeenCalled();
});
