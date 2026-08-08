/**
 * Card teaser from a public card wire object.
 *
 * Platform 4.2+ ships server-derived `summary` on job/company/talent cards
 * (operator text, or a first-sentence teaser from long-form HTML). Prefer
 * that field only — do not re-strip description/bio HTML in the app.
 */

export function cardSummary(source: {
  summary?: string | null;
}): string | null {
  const trimmed = source.summary?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
}
