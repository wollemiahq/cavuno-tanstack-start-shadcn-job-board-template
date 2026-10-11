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

/** The formatted values a "Showing …" message receives. */
export type ResultsLabels = {
  count: number;
  countLabel: string;
  from: string;
  to: string;
};

/**
 * The "Showing …" line under a results heading, picked from one listing's
 * three messages. Each listing passes its own messages (rather than this
 * module importing every listing's) so a route bundles only its own copy.
 */
export function resultsShowingLine(
  span: ResultsSpan,
  locale: string,
  lines: Record<ResultsLineKind, (labels: ResultsLabels) => string>,
): string {
  return lines[resultsLineKind(span)]({
    count: span.count,
    countLabel: span.count.toLocaleString(locale),
    from: span.from.toLocaleString(locale),
    to: span.to.toLocaleString(locale),
  });
}
