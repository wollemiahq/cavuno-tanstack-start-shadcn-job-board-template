import { describe, expect, it } from 'vitest';

import { parseCompaniesSearch } from './companies-search';
import { parseJobsSearch } from './jobs-search';
import { SEARCH_QUERY_MAX_LENGTH, searchQueryString } from './pagination';
import { parseTalentSearch } from './talent-search';

/**
 * The board API's free-text search is `z.string().max(200)`, so a longer
 * `?q=` came back 400 and escaped the loader as a 500. Measured live before
 * the fix: 200 characters rendered, 201 crashed `/jobs`, `/talent`,
 * `/blog` AND `/companies?query=` — every surface that forwards free text.
 * Only `/salaries` was unaffected.
 *
 * 201 is not a contrived length — a candidate pasting a job description or a
 * requirements list into search clears it easily. These pin the clamp at
 * every surface that reaches the API, so one route cannot regress alone.
 */
const OVER = 'x'.repeat(SEARCH_QUERY_MAX_LENGTH + 1);
const AT = 'x'.repeat(SEARCH_QUERY_MAX_LENGTH);

describe('free-text search is clamped to what the API accepts', () => {
  it('truncates rather than dropping, so the search still means something', () => {
    const out = searchQueryString(OVER);
    expect(out).toHaveLength(SEARCH_QUERY_MAX_LENGTH);
    expect(OVER.startsWith(out!)).toBe(true);
  });

  it('leaves a query at the limit untouched', () => {
    expect(searchQueryString(AT)).toBe(AT);
  });

  it('still drops empty and non-string values', () => {
    expect(searchQueryString('')).toBeUndefined();
    expect(searchQueryString(undefined)).toBeUndefined();
    expect(searchQueryString(42)).toBeUndefined();
  });

  it.each([
    ['jobs', () => parseJobsSearch({ q: OVER }).q],
    ['jobs via ?query=', () => parseJobsSearch({ query: OVER }).q],
    ['talent', () => parseTalentSearch({ q: OVER }).q],
    ['companies', () => parseCompaniesSearch({ query: OVER }).query],
  ])('%s clamps an over-long query', (_label, read) => {
    expect(read()).toHaveLength(SEARCH_QUERY_MAX_LENGTH);
  });
});
