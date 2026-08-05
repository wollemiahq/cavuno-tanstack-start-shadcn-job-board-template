/**
 * Canonical wire-enum → display-label vocabulary.
 *
 * The SDK no longer ships chrome words (`fieldLabel`, `seniorityLabels`,
 * salary-lexicon timeframes). Every enum value the board surfaces maps
 * through here to a Paraglide message so drift has one place to fix.
 *
 * Labels default to the visitor locale (`getLocale()` via Paraglide) like
 * the rest of the chrome catalog; callers rendering outside a request's
 * chrome context (the OG image renderer) pass the board language.
 */
import { m } from '../paraglide/messages';
import { isLocale } from '../paraglide/runtime';

type MessageFn = (
  inputs?: Record<string, never>,
  options?: { locale?: 'de' | 'en' | 'fr' },
) => string;

const REMOTE_LABELS: Record<string, MessageFn> = {
  on_site: m.label_remoteOnSite,
  hybrid: m.label_remoteHybrid,
  remote: m.label_remoteRemote,
};

const EMPLOYMENT_LABELS: Record<string, MessageFn> = {
  full_time: m.label_employmentFullTime,
  part_time: m.label_employmentPartTime,
  contract: m.label_employmentContract,
  internship: m.label_employmentInternship,
  temporary: m.label_employmentTemporary,
  volunteer: m.label_employmentVolunteer,
  other: m.label_employmentOther,
};

const SENIORITY_LABELS: Record<string, MessageFn> = {
  entry_level: m.label_seniorityEntryLevel,
  associate: m.label_seniorityAssociate,
  mid_level: m.label_seniorityMidLevel,
  senior: m.label_senioritySenior,
  lead: m.label_seniorityLead,
  principal: m.label_seniorityPrincipal,
  director: m.label_seniorityDirector,
  executive: m.label_seniorityExecutive,
};

const TIMEFRAME_LABELS: Record<string, MessageFn> = {
  per_year: m.label_salaryTimeframePerYear,
  per_month: m.label_salaryTimeframePerMonth,
  per_week: m.label_salaryTimeframePerWeek,
  per_day: m.label_salaryTimeframePerDay,
  per_hour: m.label_salaryTimeframePerHour,
};

// TIMEFRAME_LABELS is deliberately NOT merged here: those are the post-job
// form's option captions ("Yearly"), and routing them through the general
// display resolver is exactly how "$105–130K / Yearly" shipped. Display
// joins use the jobSalary_unitPer* nouns via formatJobSalary instead.
const ALL_LABELS: Record<string, MessageFn> = {
  ...REMOTE_LABELS,
  ...EMPLOYMENT_LABELS,
  ...SENIORITY_LABELS,
};

/**
 * Display label for a job wire enum value (`remoteOption`, `employmentType`,
 * `seniority`). Unknown values return `null` so callers can fall back to the
 * raw wire string or a placeholder. Salary timeframes are intentionally not
 * resolvable here — use `salaryTimeframeLabel` (forms) or the salary join.
 */
export function enumLabel(
  value: string | null | undefined,
  language?: string,
): string | null {
  if (!value) return null;
  const message = ALL_LABELS[value];
  if (!message) return null;
  return message({}, isLocale(language) ? { locale: language } : undefined);
}

/** Seniority → label map for filter multi-selects (full ladder). */
export function seniorityLabelMap(
  keys: readonly string[],
): Record<string, string> {
  return Object.fromEntries(
    keys.map((key) => [key, enumLabel(key) ?? key.replace(/_/g, ' ')]),
  );
}

/** Form option captions for the five salary timeframes. */
export function salaryTimeframeLabel(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  const message = TIMEFRAME_LABELS[value];
  return message ? message() : null;
}
