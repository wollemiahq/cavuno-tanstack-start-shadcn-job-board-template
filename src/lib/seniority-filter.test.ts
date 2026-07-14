import { SENIORITIES } from '@cavuno/board/filters';
/**
 * Seniority MultiSelect ⇄ URL-filter mapping (CAV-495). The seniority chips
 * became the Untitled UI `MultiSelect`; these lock the URL-semantics the
 * swap must preserve — the WHY, not the widget: an empty selection CLEARS
 * the filter (undefined, so the param drops from the URL rather than
 * persisting an empty `[]`), the "all" sentinel expands to every canonical
 * level, and a concrete selection round-trips through the controlled value.
 */
import { describe, expect, it } from 'vitest';

import {
  seniorityFromSelection,
  selectionFromSeniority,
} from './seniority-filter';

describe('seniorityFromSelection', () => {
  it('clears the filter (undefined) when nothing is selected', () => {
    // undefined — not [] — so the URL param drops instead of lingering empty.
    expect(seniorityFromSelection(new Set())).toBeUndefined();
  });

  it('returns the selected levels for a concrete selection', () => {
    expect(seniorityFromSelection(new Set(['senior', 'lead']))).toEqual([
      'senior',
      'lead',
    ]);
  });

  it("expands the 'all' sentinel to every canonical level", () => {
    expect(seniorityFromSelection('all')).toEqual([...SENIORITIES]);
  });
});

describe('selectionFromSeniority', () => {
  it('round-trips a filter through the controlled Selection', () => {
    const selection = selectionFromSeniority(['senior']);
    expect(selection).toBeInstanceOf(Set);
    expect(seniorityFromSelection(selection)).toEqual(['senior']);
  });

  it('maps an absent filter to an empty (cleared) selection', () => {
    expect(
      seniorityFromSelection(selectionFromSeniority(undefined)),
    ).toBeUndefined();
  });
});
