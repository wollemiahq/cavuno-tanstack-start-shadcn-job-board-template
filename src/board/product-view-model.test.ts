import { describe, expect, it } from 'vitest';

import { productFactRows, ratingHistogramRows } from './product-view-model';

describe('productFactRows', () => {
  const computed = [
    { label: 'Pages', value: '20' },
    { label: 'Files', value: 'PDF' },
  ];

  it('drops each computed row the seller already gave, ignoring case and spaces', () => {
    expect(
      productFactRows(
        [{ label: '  pages ', value: '1 or 2 per template' }],
        computed,
      ),
    ).toEqual([
      { label: '  pages ', value: '1 or 2 per template' },
      { label: 'Files', value: 'PDF' },
    ]);
    expect(
      productFactRows([{ label: 'FILES', value: 'Google Docs' }], computed),
    ).toEqual([
      { label: 'FILES', value: 'Google Docs' },
      { label: 'Pages', value: '20' },
    ]);
  });

  it('keeps every computed row when the seller gave none of them', () => {
    expect(
      productFactRows([{ label: 'Format', value: 'A4' }], computed),
    ).toEqual([{ label: 'Format', value: 'A4' }, ...computed]);
  });
});

describe('ratingHistogramRows', () => {
  it('lists 5 stars first with each star’s share of all ratings', () => {
    const rows = ratingHistogramRows([0, 0, 1, 1, 2]);
    expect(rows.map((row) => [row.stars, row.count, row.share])).toEqual([
      [5, 2, 0.5],
      [4, 1, 0.25],
      [3, 1, 0.25],
      [2, 0, 0],
      [1, 0, 0],
    ]);
  });

  it('gives every row a zero share when nothing is counted', () => {
    expect(ratingHistogramRows([]).every((row) => row.share === 0)).toBe(true);
  });
});
