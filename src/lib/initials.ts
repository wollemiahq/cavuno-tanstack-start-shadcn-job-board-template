/**
 * Two-letter initials for an Avatar fallback (mirrors the JobCard pattern):
 * the first letter of the first two words, uppercased. Returns `undefined`
 * for an empty/whitespace name so the Avatar falls back to its icon.
 */
let graphemes: Intl.Segmenter | undefined;

export function initialsOf(name: string): string | undefined {
  // One segmenter for every call: building one costs more than the
  // segmenting, and a listing page asks for initials once per card.
  graphemes ??= new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  const segmenter = graphemes;
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map(
        (word) =>
          segmenter.segment(word)[Symbol.iterator]().next().value?.segment ??
          '',
      )
      .slice(0, 2)
      .join('')
      .toUpperCase() || undefined
  );
}
