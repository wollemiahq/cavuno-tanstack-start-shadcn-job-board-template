import { describe, expect, it } from 'vitest';

import {
  filtersFromJob,
  listFiltersToTalentSearch,
  parseTalentSearch,
  talentListDisplayName,
  talentListFiltersEqual,
  talentListingLoaderDeps,
  talentSearchFromHeader,
  talentSearchToListFilters,
} from './talent-search';

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

  it('reads Open to relocate from a bare or router-quoted URL value', () => {
    // `?openToRelocate=true` parses to a boolean, `%22true%22` to a string.
    expect(parseTalentSearch({ openToRelocate: true }).openToRelocate).toBe(
      'true',
    );
    expect(parseTalentSearch({ openToRelocate: false }).openToRelocate).toBe(
      'false',
    );
    expect(parseTalentSearch({ openToRelocate: 'false' }).openToRelocate).toBe(
      'false',
    );
    expect(
      parseTalentSearch({ openToRelocate: 'yes' }).openToRelocate,
    ).toBeUndefined();
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

describe('talentSearchFromHeader', () => {
  it('keeps the active filters, profile-field filters included, for a new keyword', () => {
    const next = talentSearchFromHeader(
      {
        q: 'designer',
        jobSearchStatus: 'actively_looking',
        'cf.open_to_mentoring': true,
        'cf.availability': 'now,month',
        page: '3',
      },
      { query: 'researcher', place: 'berlin' },
    );

    expect(next).toMatchObject({
      q: 'researcher',
      place: 'berlin',
      jobSearchStatus: 'actively_looking',
      'cf.open_to_mentoring': true,
      'cf.availability': 'now,month',
    });
    expect(next.page).toBeUndefined();
  });
});

describe('talent search distance', () => {
  it('keeps a preset or exact `within` and drops anything else', () => {
    expect(parseTalentSearch({ place: 'houston', within: '10' }).within).toBe(
      10,
    );
    expect(parseTalentSearch({ place: 'houston', within: '0' }).within).toBe(0);
    expect(
      parseTalentSearch({ place: 'houston', within: '7' }).within,
    ).toBeUndefined();
  });

  it('sends `within` to the directory only with a place', () => {
    expect(
      talentListingLoaderDeps(
        parseTalentSearch({ place: 'houston', within: '10' }),
      ),
    ).toMatchObject({ place: 'houston', within: 10 });
    expect(
      talentListingLoaderDeps(parseTalentSearch({ within: '10' })).within,
    ).toBeUndefined();
  });

  it('keeps the distance for a new keyword and resets it for a new place', () => {
    const current = { q: 'nurse', place: 'houston', within: '10' };

    expect(
      talentSearchFromHeader(current, { query: 'doctor', place: 'houston' })
        .within,
    ).toBe(10);
    expect(
      talentSearchFromHeader(current, { query: 'nurse', place: 'dallas' })
        .within,
    ).toBeUndefined();
  });

  it('leaves the distance out of a saved list predicate', () => {
    expect(
      talentSearchToListFilters(
        parseTalentSearch({ place: 'houston', within: '10' }),
      ),
    ).toEqual({ place: 'houston' });
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
    // The header owns the free-text query, while a deep-linked `?skill=`
    // value still filters the directory.
    expect(
      talentListingLoaderDeps(parseTalentSearch({ skill: 'accessibility' })),
    ).toEqual({
      q: undefined,
      skill: 'accessibility',
      page: undefined,
    });
  });

  it('keeps the active list id out of directory loader deps', () => {
    expect(
      talentListingLoaderDeps(
        parseTalentSearch({ q: 'go', list: 'list_berlin' }),
      ),
    ).not.toHaveProperty('list');
  });

  it('keeps the Saved view and its stage out of directory loader deps', () => {
    const deps = talentListingLoaderDeps(
      parseTalentSearch({
        q: 'go',
        list: 'list_berlin',
        saved: '1',
        stage: 'stage_shortlisted',
      }),
    );
    expect(deps).not.toHaveProperty('saved');
    expect(deps).not.toHaveProperty('stage');
  });

  it('reads the Saved view flag from the URL', () => {
    expect(parseTalentSearch({ saved: '1' }).saved).toBe(true);
    expect(parseTalentSearch({ saved: true }).saved).toBe(true);
    expect(parseTalentSearch({ saved: 'no' }).saved).toBeUndefined();
  });
});

describe('talent list filter round-trip', () => {
  it('stores the frozen query and drops page plus the selected pane', () => {
    const filters = talentSearchToListFilters(
      parseTalentSearch({
        q: 'platform',
        skill: 'go',
        languages: ' German, English ',
        openToRelocate: 'true',
        sort: 'newest',
        page: '3',
        selectedTalent: 'casey',
      }),
    );

    expect(filters).toEqual({
      q: 'platform',
      skill: 'go',
      languages: ['German', 'English'],
      openToRelocate: true,
      sort: 'newest',
    });
    expect(listFiltersToTalentSearch(filters)).toEqual({
      q: 'platform',
      skill: 'go',
      jobSearchStatus: undefined,
      languages: 'German,English',
      openToRelocate: 'true',
      place: undefined,
      within: undefined,
      sort: 'newest',
      seniority: undefined,
      permitCountry: undefined,
      interestedRole: undefined,
    });
  });

  it('opens a saved list place as the place itself, not widened', () => {
    expect(
      listFiltersToTalentSearch({ place: 'houston-tx-united-states' }),
    ).toMatchObject({ place: 'houston-tx-united-states', within: 0 });
  });

  it('maps a blank directory to an empty predicate', () => {
    expect(talentSearchToListFilters(parseTalentSearch({}))).toEqual({});
  });

  it('seeds a job-bound list from the job title keyword and current place', () => {
    expect(filtersFromJob({ title: '  Smoke Robotics Engineer  ' })).toEqual({
      q: 'Smoke Robotics Engineer',
    });
    expect(filtersFromJob({ title: 'Backend' }, { place: 'berlin' })).toEqual({
      q: 'Backend',
      place: 'berlin',
    });
  });

  it('drops a trailing list suffix from display names', () => {
    expect(talentListDisplayName('DevOps Engineer list')).toBe(
      'DevOps Engineer',
    );
    expect(talentListDisplayName('Blank reusable')).toBe('Blank reusable');
  });

  it('compares list filters by JSON identity', () => {
    expect(talentListFiltersEqual({ skill: 'go' }, { skill: 'go' })).toBe(true);
    expect(talentListFiltersEqual({ skill: 'go' }, { skill: 'rust' })).toBe(
      false,
    );
  });
});
