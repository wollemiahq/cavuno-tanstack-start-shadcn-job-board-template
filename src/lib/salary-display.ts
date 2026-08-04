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
 *
 * Until 4.0 is published, the installed pin may still return a bare string
 * (3.2.0) or the intermediate `{ text, bound }`. Accept all three so the
 * starter typechecks and tests cleanly against either. Remove the
 * compatibility branches once the pin moves to 4.0.0.
 */
import {
  formatSalaryRange as sdkFormatSalaryRange,
  type SalaryTimeframeInput,
  type SalaryTimeframeOverrides,
} from '@cavuno/board/format';

import { m } from '../paraglide/messages';

type SalaryRangeResult =
  | string
  | {
      text: string;
      timeframe?: string | null;
      bound: 'range' | 'from' | 'upTo';
    }
  | null;

/** Format a job salary range with bound chrome for open floors/ceilings. */
export function formatJobSalary(
  language: string | undefined,
  min: number | null,
  max: number | null,
  timeframe: SalaryTimeframeInput,
  currency?: string | null,
  timeframeOverrides?: SalaryTimeframeOverrides,
): string | null {
  const formatted = sdkFormatSalaryRange(
    language,
    min,
    max,
    timeframe,
    currency,
    timeframeOverrides,
  ) as SalaryRangeResult;
  if (!formatted) return null;
  if (typeof formatted === 'string') return formatted;

  // Timeframe first, then the bound chrome wraps the whole phrase — "From
  // $90K / year", not "From $90K" / "year".
  const amount = formatted.timeframe
    ? m.jobSalary_perTimeframe({
        amount: formatted.text,
        unit: formatted.timeframe,
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
