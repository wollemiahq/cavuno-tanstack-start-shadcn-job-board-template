export interface TalentSearch {
  /** Opaque cursor used by the Talent API. */
  cursor?: string;
  /** Candidate name or headline query. */
  q?: string;
  /** Free-form skill-name filter. */
  skill?: string;
  /** Desktop detail-pane selection; the canonical public profile handle. */
  selectedTalent?: string;
}

export type TalentListingSearch = Omit<TalentSearch, 'selectedTalent'>;

function stringSearchValue(value: unknown) {
  if (typeof value !== 'string') return undefined;
  return value.trim() || undefined;
}

export function parseTalentSearch(
  search: Record<string, unknown>,
): TalentSearch {
  return {
    q: stringSearchValue(search.q),
    skill: stringSearchValue(search.skill),
    cursor: stringSearchValue(search.cursor),
    selectedTalent: stringSearchValue(search.selectedTalent),
  };
}

/** A detail-pane selection changes history, but never the directory request. */
export function talentListingLoaderDeps(
  search: TalentSearch,
): TalentListingSearch {
  return {
    q: search.q,
    skill: search.skill,
    cursor: search.cursor,
  };
}

export function talentSearchSubmission(
  _current: TalentSearch,
  next: Pick<TalentSearch, 'q' | 'skill'>,
): TalentSearch {
  return {
    q: stringSearchValue(next.q),
    skill: stringSearchValue(next.skill),
    cursor: undefined,
    selectedTalent: undefined,
  };
}
