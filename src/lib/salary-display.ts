/**
 * Job-salary presentation — wraps SDK `formatSalaryRange` so open bounds
 * get application-owned chrome ("From" / "Up to") from Paraglide.
 *
 * SDK 4.0 returns `{ text, bound }`; rendering only `text` would make a
 * min-only and max-only salary look identical and misstate pay.
 *
 * Until 4.0 is published, the installed pin may still return a bare string
 * (3.2.0). Accept both shapes so the starter typechecks and tests cleanly
 * against either.
 */
import {
  formatSalaryRange as sdkFormatSalaryRange,
  type SalaryTimeframeInput,
  type SalaryTimeframeOverrides,
} from '@cavuno/board/format';

import { m } from '../paraglide/messages';

type SalaryRangeResult =
  | string
  | { text: string; bound: 'range' | 'from' | 'upTo' }
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
  if (formatted.bound === 'from') {
    return m.jobSalary_boundFrom({ amount: formatted.text });
  }
  if (formatted.bound === 'upTo') {
    return m.jobSalary_boundUpTo({ amount: formatted.text });
  }
  return formatted.text;
}
