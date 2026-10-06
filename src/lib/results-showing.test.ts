import { describe, expect, it } from 'vitest';

import { m } from '../paraglide/messages';
import { resultsLineKind } from './results-showing';

import { companiesResultsShowingLine } from '@/components/board/company-search-page';
import { jobsResultsShowingLine } from '@/components/board/jobs-results-bar';
import { talentResultsShowingLine } from '@/components/board/talent-search-page';

describe('resultsLineKind', () => {
  it('is single for exactly one result', () => {
    expect(resultsLineKind({ from: 1, to: 1, count: 1 })).toBe('single');
  });

  it('is lastPage for a last page holding one of several results', () => {
    expect(resultsLineKind({ from: 21, to: 21, count: 21 })).toBe('lastPage');
  });

  it('is range otherwise', () => {
    expect(resultsLineKind({ from: 1, to: 20, count: 93 })).toBe('range');
    expect(resultsLineKind({ from: 21, to: 22, count: 22 })).toBe('range');
  });
});

describe('results showing lines', () => {
  it('counts the one result, with no range', () => {
    const one = { from: 1, to: 1, count: 1 };

    expect(jobsResultsShowingLine(one, 'en')).toBe(
      m.jobSearch_resultsShowingCount({ count: 1, countLabel: '1' }),
    );
    expect(companiesResultsShowingLine(one, 'en')).toBe(
      m.companySearch_resultsShowingCount({ count: 1, countLabel: '1' }),
    );
    expect(talentResultsShowingLine(one, 'en')).toBe(
      m.talentSearch_resultsShowingCount({ count: 1, countLabel: '1' }),
    );
    expect(jobsResultsShowingLine(one, 'en')).not.toMatch(/1–1/);
  });

  it('says the position of a last page holding one result', () => {
    const last = { from: 21, to: 21, count: 21 };
    const args = { to: '21', count: 21, countLabel: '21' };

    expect(jobsResultsShowingLine(last, 'en')).toBe(
      m.jobSearch_resultsShowingLast(args),
    );
    expect(companiesResultsShowingLine(last, 'en')).toBe(
      m.companySearch_resultsShowingLast(args),
    );
    expect(talentResultsShowingLine(last, 'en')).toBe(
      m.talentSearch_resultsShowingLast(args),
    );
    expect(jobsResultsShowingLine(last, 'en')).not.toMatch(/21–21/);
  });

  it('keeps the range otherwise, with locale number formatting', () => {
    const span = { from: 1001, to: 1020, count: 1234 };

    expect(jobsResultsShowingLine(span, 'en')).toBe(
      m.jobSearch_resultsShowingRange({
        from: '1,001',
        to: '1,020',
        count: 1234,
        countLabel: '1,234',
      }),
    );
    expect(companiesResultsShowingLine(span, 'en')).toBe(
      m.companySearch_resultsShowingRange({
        from: '1,001',
        to: '1,020',
        count: '1,234',
      }),
    );
    expect(talentResultsShowingLine(span, 'en')).toBe(
      m.talentSearch_resultsShowingRange({
        from: '1,001',
        to: '1,020',
        count: '1,234',
      }),
    );
  });
});
