import { describe, expect, it } from 'vitest';

import { parseTalentSearch, talentListingLoaderDeps } from './talent-search';

describe('parseTalentSearch', () => {
  it('keeps only trimmed Talent listing and selection state', () => {
    expect(
      parseTalentSearch({
        q: '  product researcher  ',
        skill: '  accessibility  ',
        cursor: '  next-page-token  ',
        selectedTalent: '  ada-lovelace  ',
        query: 'company-only query',
        page: '3',
      }),
    ).toEqual({
      q: 'product researcher',
      skill: 'accessibility',
      cursor: 'next-page-token',
      selectedTalent: 'ada-lovelace',
    });
  });

  it('coerces a numeric-looking cursor back to a string so it survives a direct load', () => {
    // The router parses `?cursor=2` as the number 2 before validateSearch runs;
    // the cursor must not be dropped or the paginated directory URL 307s home.
    expect(parseTalentSearch({ cursor: 2 })).toEqual({
      q: undefined,
      skill: undefined,
      cursor: '2',
      selectedTalent: undefined,
    });
  });

  it('drops blank and non-string URL values', () => {
    expect(
      parseTalentSearch({
        q: '  ',
        skill: 42,
        cursor: null,
        selectedTalent: ['ada-lovelace'],
      }),
    ).toEqual({
      q: undefined,
      skill: undefined,
      cursor: undefined,
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
        cursor: 'next-page-token',
        selectedTalent: 'first-candidate',
      }),
    );
    const second = talentListingLoaderDeps(
      parseTalentSearch({
        q: 'researcher',
        skill: 'accessibility',
        cursor: 'next-page-token',
        selectedTalent: 'second-candidate',
      }),
    );

    expect(first).toEqual({
      q: 'researcher',
      skill: 'accessibility',
      cursor: 'next-page-token',
    });
    expect(first).toEqual(second);
    expect(first).not.toHaveProperty('selectedTalent');
  });

  it('preserves a deep-linked ?skill= facet as a directory dependency', () => {
    // The in-page skill box was removed (ADR-0075: the header owns the
    // query), but a `?skill=` link must still filter the directory.
    expect(
      talentListingLoaderDeps(parseTalentSearch({ skill: 'accessibility' })),
    ).toEqual({ q: undefined, skill: 'accessibility', cursor: undefined });
  });
});
