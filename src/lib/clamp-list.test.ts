import { describe, expect, it } from 'vitest';

import { clampList } from './clamp-list';

describe('clampList', () => {
  it('keeps every item and reports no overflow when the list fits', () => {
    expect(clampList(['a', 'b'], 3)).toEqual({
      visible: ['a', 'b'],
      overflow: 0,
    });
  });

  it('clamps to the limit and counts the hidden remainder as overflow', () => {
    expect(clampList(['a', 'b', 'c', 'd', 'e'], 2)).toEqual({
      visible: ['a', 'b'],
      overflow: 3,
    });
  });

  it('is exact at the boundary — a full list earns no +0 overflow', () => {
    expect(clampList(['a', 'b', 'c'], 3)).toEqual({
      visible: ['a', 'b', 'c'],
      overflow: 0,
    });
  });

  it('treats a zero limit as all-overflow and never renders a negative count', () => {
    expect(clampList(['a', 'b'], 0)).toEqual({ visible: [], overflow: 2 });
    expect(clampList([], 4)).toEqual({ visible: [], overflow: 0 });
  });

  it('does not mutate the source list', () => {
    const source = ['a', 'b', 'c'];
    clampList(source, 1);
    expect(source).toEqual(['a', 'b', 'c']);
  });
});
