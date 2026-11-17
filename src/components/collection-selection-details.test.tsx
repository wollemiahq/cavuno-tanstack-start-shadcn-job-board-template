// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CollectionSelectionDetails } from './collection-selection-details';

import type { ProfileCollectionDefinition } from '@/board/form-layout';
import type { ProfileSelection } from '@/board/profile-field-writes';
import { m } from '@/paraglide/messages';

afterEach(cleanup);

const definition: ProfileCollectionDefinition = {
  key: 'cards',
  label: 'Site cards',
  typeId: 'card',
  multiple: true,
  visibility: 'public',
  editableByOwner: true,
  allowOverrides: false,
  valueDefinitions: [
    {
      key: 'issuer',
      label: 'Issuer',
      type: 'short_text',
      required: false,
      visibility: 'public',
      editableByOwner: false,
    },
  ],
  entryDefinitions: [
    {
      key: 'number',
      label: 'Card number',
      type: 'short_text',
      required: true,
      visibility: 'private',
      editableByOwner: true,
    },
  ],
};

const white: ProfileSelection = {
  id: 'white',
  name: 'White card',
  values: { issuer: 'The board' },
  entries: [{ key: 'e1', values: { number: 'A-1' }, stored: true }],
};

describe('CollectionSelectionDetails', () => {
  it('draws each chosen entry’s details and rows with the custom field inputs', () => {
    render(
      <CollectionSelectionDetails
        definition={definition}
        value={[white]}
        onChange={vi.fn()}
      />,
    );
    expect(
      screen.getByRole('group', { name: 'White card' }),
    ).toBeInTheDocument();
    // A board-managed detail shows, but the owner cannot change it.
    expect(screen.getByLabelText('Issuer')).toHaveAttribute('readonly');
    expect(screen.getByLabelText('Card number')).toHaveValue('A-1');
    expect(screen.getByLabelText('Card number')).toBeRequired();
    expect(screen.getByText(m.customField_privateNote())).toBeInTheDocument();
  });

  it('adds a row with a new key and removes one, keeping stored rows a board-managed detail locks', () => {
    const onChange = vi.fn<(value: ProfileSelection[]) => void>();
    const { rerender } = render(
      <CollectionSelectionDetails
        definition={definition}
        value={[white]}
        onChange={onChange}
      />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: m.collectionField_addEntryLabel() }),
    );
    const added = onChange.mock.calls[0]![0];
    expect(added[0]!.entries).toEqual([
      white.entries[0],
      { key: expect.stringMatching(/^e[a-f0-9]+$/), values: {} },
    ]);

    // The stored row stays; only the new one can be removed.
    rerender(
      <CollectionSelectionDetails
        definition={{
          ...definition,
          entryDefinitions: [
            ...definition.entryDefinitions!,
            {
              key: 'expiry',
              label: 'Expiry',
              type: 'date',
              required: false,
              visibility: 'public',
              editableByOwner: false,
            },
          ],
        }}
        value={added}
        onChange={onChange}
      />,
    );
    expect(
      screen.queryByRole('button', {
        name: m.collectionField_removeEntryAriaLabel({ number: 1 }),
      }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', {
        name: m.collectionField_removeEntryAriaLabel({ number: 2 }),
      }),
    );
    expect(onChange.mock.calls[1]![0][0].entries).toEqual([white.entries[0]]);
  });
});
