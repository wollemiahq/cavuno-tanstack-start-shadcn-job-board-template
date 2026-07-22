import { describe, expect, it } from 'vitest';

import { parseTalentSearch, talentListingLoaderDeps } from './talent-search';

describe('parseTalentSearch', () => {
  it('keeps only trimmed Talent listing and selection state', () => {
    expect(
      parseTalentSearch({
        q: '  product researcher  ',
        skill: '  accessibility  ',
        page: '3',
        selectedTalent: '  ada-lovelace  ',
        query: 'company-only query',
      }),
    ).toEqual({
      q: 'product researcher',
      skill: 'accessibility',
      page: 3,
      selectedTalent: 'ada-lovelace',
    });
  });

  it('collapses page 1 to a clean URL and rejects invalid page values', () => {
    // The directory is offset-paginated with a 1-based `?page=`; page 1 drops
    // from the URL, and anything invalid collapses to page 1 (also dropped).
    expect(parseTalentSearch({ page: '1' })).toEqual({
      q: undefined,
      skill: undefined,
      page: undefined,
      selectedTalent: undefined,
    });
    expect(parseTalentSearch({ page: '0' }).page).toBeUndefined();
    expect(parseTalentSearch({ page: 'nope' }).page).toBeUndefined();
    expect(parseTalentSearch({ page: '4' }).page).toBe(4);
  });

  it('drops blank and non-string URL values', () => {
    expect(
      parseTalentSearch({
        q: '  ',
        skill: 42,
        selectedTalent: ['ada-lovelace'],
      }),
    ).toEqual({
      q: undefined,
      skill: undefined,
      page: undefined,
      selectedTalent: undefined,
    });
  });
});

describe('talentListingLoaderDeps', () => {
  it('keeps listing inputs while excluding the selected detail pane', () => {
    const first = talentListingLoaderDeps(
      parseTalentSearch({
        q: 'researcher',
        skill: 'accessibility',
        page: '2',
        selectedTalent: 'first-candidate',
      }),
    );
    const second = talentListingLoaderDeps(
      parseTalentSearch({
        q: 'researcher',
        skill: 'accessibility',
        page: '2',
        selectedTalent: 'second-candidate',
      }),
    );

    expect(first).toEqual({
      q: 'researcher',
      skill: 'accessibility',
      page: 2,
    });
    expect(first).toEqual(second);
    expect(first).not.toHaveProperty('selectedTalent');
  });

  it('preserves a deep-linked ?skill= facet as a directory dependency', () => {
    // The in-page skill box was removed (ADR-0075: the header owns the
    // query), but a `?skill=` link must still filter the directory.
    expect(
      talentListingLoaderDeps(parseTalentSearch({ skill: 'accessibility' })),
    ).toEqual({ q: undefined, skill: 'accessibility', page: undefined });
  });
});
