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
 * Timeframe is the wire enum on the result; map it to a display unit noun
 * before joining. Missing currency → null (never invent USD).
 */
import {
  formatSalaryRange as sdkFormatSalaryRange,
  type SalaryTimeframeInput,
  type SalaryTimeframeValue,
} from '@cavuno/board/format';

import { m } from '../paraglide/messages';
import { isLocale } from '../paraglide/runtime';

/**
 * Display unit nouns for the salary join — "$105K–$130K / year", "… pro
 * Jahr", "… par an". Deliberately NOT the post-a-job form's option captions
 * (`label_salaryTimeframe*`: "Yearly", "pro Jahr"): those are dropdown
 * adjectives, and reusing them here rendered "/ Yearly" in English and
 * doubled the preposition in German ("pro pro Jahr").
 */
const TIMEFRAME_UNITS: Record<
  SalaryTimeframeValue,
  typeof m.jobSalary_unitPerYear
> = {
  per_year: m.jobSalary_unitPerYear,
  per_month: m.jobSalary_unitPerMonth,
  per_week: m.jobSalary_unitPerWeek,
  per_day: m.jobSalary_unitPerDay,
  per_hour: m.jobSalary_unitPerHour,
};

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

  // The board language drives the join when it is a chrome locale — this
  // function formats board content and is also called from server loaders.
  // For board languages outside the chrome set, fall back to the ambient
  // Paraglide locale (messages only exist for the chrome locales anyway).
  const locale = isLocale(language) ? { locale: language } : undefined;
  // Timeframe first, then the bound chrome wraps the whole phrase — "From
  // $90K / year", not "From $90K" / "year".
  // Defensive lookup: the SDK types timeframe as the five wire values or
  // null, but a stale compiled message catalog (dev HMR) once left the map
  // values undefined and white-screened the page. Missing unit ⇒ render the
  // amount without a unit, never throw.
  const unitMessage = formatted.timeframe
    ? TIMEFRAME_UNITS[formatted.timeframe]
    : undefined;
  const unit =
    typeof unitMessage === 'function' ? unitMessage({}, locale) : null;
  const amount = unit
    ? m.jobSalary_perTimeframe({ amount: formatted.text, unit }, locale)
    : formatted.text;

  if (formatted.bound === 'from') {
    return m.jobSalary_boundFrom({ amount }, locale);
  }
  if (formatted.bound === 'upTo') {
    return m.jobSalary_boundUpTo({ amount }, locale);
  }
  return amount;
}
