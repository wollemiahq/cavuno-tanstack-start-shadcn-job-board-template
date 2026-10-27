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

  it('rounds to whole percents that add up to 100', () => {
    const percents = (histogram: number[]) =>
      ratingHistogramRows(histogram).map((row) => Math.round(row.share * 100));

    // 4 + 1 + 1 + 1 + 1: plain rounding shows 50/13/13/13/13 = 102%.
    expect(percents([1, 1, 1, 1, 4])).toEqual([50, 13, 13, 12, 12]);
    // 5 + 1 + 1 of 7: plain rounding shows 71/14/14 = 99%.
    expect(percents([0, 0, 1, 1, 5])).toEqual([72, 14, 14, 0, 0]);
  });

  it('gives every row a zero share when nothing is counted', () => {
    expect(ratingHistogramRows([]).every((row) => row.share === 0)).toBe(true);
  });
});
