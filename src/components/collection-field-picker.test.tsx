// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { m } from '../paraglide/messages';
import { CollectionFieldPicker } from './collection-field-picker';

afterEach(cleanup);

function renderPicker(definition: {
  multiple: boolean;
  maxSelections?: number;
}) {
  render(
    <CollectionFieldPicker
      definition={{ key: 'benefits', label: 'Benefits', ...definition }}
      value={[]}
      onChange={vi.fn()}
      loadChoices={vi.fn().mockResolvedValue([])}
    />,
  );
}

describe('CollectionFieldPicker selection hint', () => {
  it('announces the maximum the operator set', () => {
    renderPicker({ multiple: true, maxSelections: 3 });
    expect(
      screen.getByText(m.collectionField_maxSelectionsText({ count: 3 })),
    ).toBeInTheDocument();
  });

  it('shows no maximum when the operator set none', () => {
    renderPicker({ multiple: true });
    expect(
      screen.queryByText(m.collectionField_maxSelectionsText({ count: 100 })),
    ).toBeNull();
  });
});
