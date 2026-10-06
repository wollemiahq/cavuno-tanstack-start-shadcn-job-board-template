import { m } from '../paraglide/messages';

/** A page's place in the results: `from`–`to` of `count`, 1-based. */
export type ResultsSpan = { from: number; to: number; count: number };

/**
 * Which "Showing …" line a page gets: exactly one result ("Showing 1 job"), a
 * last page holding one result ("Showing 21 of 21 jobs", never "21–21"), or a
 * range ("Showing 1–20 of 93 jobs").
 */
export type ResultsLineKind = 'single' | 'lastPage' | 'range';

export function resultsLineKind(span: ResultsSpan): ResultsLineKind {
  if (span.count === 1) return 'single';
  if (span.from === span.to) return 'lastPage';
  return 'range';
}

type Listing = 'jobs' | 'companies' | 'talent';

/** The "Showing …" line under a jobs, companies or talent results heading. */
export function resultsShowingLine(
  listing: Listing,
  span: ResultsSpan,
  locale: string,
): string {
  const count = span.count;
  const countLabel = count.toLocaleString(locale);
  const from = span.from.toLocaleString(locale);
  const to = span.to.toLocaleString(locale);

  switch (resultsLineKind(span)) {
    case 'single':
      return {
        jobs: m.jobSearch_resultsShowingCount,
        companies: m.companySearch_resultsShowingCount,
        talent: m.talentSearch_resultsShowingCount,
      }[listing]({ count, countLabel });
    case 'lastPage':
      return {
        jobs: m.jobSearch_resultsShowingLast,
        companies: m.companySearch_resultsShowingLast,
        talent: m.talentSearch_resultsShowingLast,
      }[listing]({ to, count, countLabel });
    case 'range':
      if (listing === 'jobs') {
        return m.jobSearch_resultsShowingRange({ from, to, count, countLabel });
      }
      return (
        listing === 'companies'
          ? m.companySearch_resultsShowingRange
          : m.talentSearch_resultsShowingRange
      )({ from, to, count: countLabel });
  }
}
