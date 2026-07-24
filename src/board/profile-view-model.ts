import { formatMonthYear } from '@cavuno/board/format';

/**
 * Candidate-profile VIEW-MODEL seam. The month-granular date
 * formatter (`formatMonthYear`) the education / experience sections display is
 * called ONLY here, so those components import no SDK formatter and render
 * from a resolved string.
 */

/**
 * Month-granular display for a stored `YYYY-MM-DD` / `YYYY-MM-01` profile date
 * (education/experience start & end). Returns `''` for an absent date so the
 * caller can compose a range without a null guard.
 */
export function profileMonthLabel(
  language: string,
  value: string | null,
): string {
  if (!value) return '';
  return formatMonthYear(language, value);
}
