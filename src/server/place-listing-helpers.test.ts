import { describe, expect, it } from 'vitest';

import {
  isSalaryHubNoindex,
  isSalaryPageNoindex,
} from './place-listing-helpers';

describe('isSalaryPageNoindex', () => {
  it('is noindex only when the payload says the page is not indexable', () => {
    expect(isSalaryPageNoindex({ indexable: false })).toBe(true);
    expect(isSalaryPageNoindex({ indexable: true })).toBe(false);
  });

  it('treats a payload without the field as indexable', () => {
    expect(isSalaryPageNoindex({})).toBe(false);
  });
});

describe('isSalaryHubNoindex', () => {
  it('is noindex when no listed page is indexable', () => {
    expect(
      isSalaryHubNoindex([{ indexable: false }, { indexable: false }]),
    ).toBe(true);
  });

  it('is noindex when the hub lists nothing', () => {
    expect(isSalaryHubNoindex([])).toBe(true);
  });

  it('is indexable when at least one listed page is', () => {
    expect(
      isSalaryHubNoindex([{ indexable: false }, { indexable: true }]),
    ).toBe(false);
  });

  it('counts items without the field as indexable', () => {
    expect(isSalaryHubNoindex([{ indexable: false }, {}])).toBe(false);
  });
});
