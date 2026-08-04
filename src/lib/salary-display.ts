/**
 * Job-salary presentation — wraps SDK `formatSalaryRange` so open bounds
 * get application-owned chrome ("From" / "Up to") from Paraglide.
 *
 * SDK 4.0 returns `{ text, timeframe, bound }` and deliberately joins none
 * of them:
 * - rendering only `text` drops the timeframe entirely ("$90–120K" with no
 *   "per year"), and makes a min-only and max-only salary look identical;
 * - the SDK does not join amount to timeframe because that join IS word
 *   order — English puts the unit after with a slash, Japanese puts 年収
 *   before the amount with no space (ADR-0103).
 *
 * So both joins live here, in Paraglide, where a locale can reorder them.
 * Timeframe is the wire enum on the result; map it through the app catalog
 * before joining. Missing currency → null (never invent USD).
 */
import {
  formatSalaryRange as sdkFormatSalaryRange,
  type SalaryTimeframeInput,
} from '@cavuno/board/format';

import { m } from '../paraglide/messages';
import { salaryTimeframeLabel } from './enum-labels';

/** Format a job salary range with bound chrome for open floors/ceilings. */
export function formatJobSalary(
  language: string,
  min: number | null,
  max: number | null,
  timeframe: SalaryTimeframeInput,
  currency?: string | null,
): string | null {
  const formatted = sdkFormatSalaryRange(
    language,
    min,
    max,
    timeframe,
    currency,
  );
  if (!formatted) return null;

  // Timeframe first, then the bound chrome wraps the whole phrase — "From
  // $90K / year", not "From $90K" / "year". Map the wire enum through the
  // catalog; never paste `per_year` into the UI.
  const unit = formatted.timeframe
    ? salaryTimeframeLabel(formatted.timeframe)
    : null;
  const amount = unit
    ? m.jobSalary_perTimeframe({
        amount: formatted.text,
        unit,
      })
    : formatted.text;

  if (formatted.bound === 'from') {
    return m.jobSalary_boundFrom({ amount });
  }
  if (formatted.bound === 'upTo') {
    return m.jobSalary_boundUpTo({ amount });
  }
  return amount;
}
