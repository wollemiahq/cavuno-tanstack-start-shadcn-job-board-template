/**
 * Template-side plan copy localization — same pattern as
 * `custom-field-labels.ts`, but WITHOUT a contract-blessed key: plans carry
 * only freeform operator-authored `name`/`description` in the board language
 * (platform follow-up: per-locale plan translations in /v1). On board-language
 * pages the operator's description is shown as written. Other chrome locales
 * get translated copy: known plans matched by their authoring NAME, else a
 * summary composed from the plan's structured facts. A known plan whose
 * description is still the English platform seed is not operator copy, so it
 * keeps its translation on board-language pages too.
 */
import { m } from '../paraglide/messages';
import {
  baseLocale,
  getLocale,
  isLocale,
  type Locale,
} from '../paraglide/runtime';

type MessageFn = (
  inputs?: Record<string, never>,
  options?: { locale?: Locale },
) => string;

interface PlanLabelEntry {
  name: MessageFn;
  description: MessageFn;
  /** The English description the platform seeds this plan with. */
  seedDescription: string;
}

const PLAN_LABELS = new Map<string, PlanLabelEntry>([
  [
    'Free',
    {
      name: m.plan_free_name,
      description: m.plan_free_description,
      seedDescription: 'A 30 day standard listing',
    },
  ],
  [
    'Featured listing',
    {
      name: m.plan_featuredListing_name,
      description: m.plan_featuredListing_description,
      seedDescription:
        'A 30 day featured listing — pinned to the top of the board and highlighted in the weekly alert digest.',
    },
  ],
  [
    'Talent access — monthly',
    {
      name: m.plan_talentAccessMonthly_name,
      description: m.plan_talentAccessMonthly_description,
      seedDescription:
        'Search the talent directory and unlock candidate profiles. 25 profile unlocks and 10 outreach messages every month.',
    },
  ],
]);

function localeOpt(language?: string) {
  return isLocale(language) ? { locale: language } : undefined;
}

/** Localized plan name; wire authoring name as fallback. */
export function planName(plan: { name: string }, language?: string): string {
  const entry = PLAN_LABELS.get(plan.name);
  return entry ? entry.name({}, localeOpt(language)) : plan.name;
}

interface PlanFacts {
  name: string;
  description?: string | null;
  kind?: string;
  purpose?: string | null;
  features?:
    | Record<string, { value?: string | null }>
    | { key: string | null; value: string | null }[];
  featureSummary?: {
    durationDays: number;
    maxActiveJobs: number;
    featuredSlots: number;
  } | null;
}

/**
 * Plan description. The operator's own description wins on board-language
 * pages (`baseLocale` is the board language) unless it is a known plan's
 * untouched seed. Otherwise, three tiers:
 * 1. the name-keyed map (richest — carries operator nuance in translation);
 * 2. composed from the wire's STRUCTURED facts (`featureSummary` —
 *    durationDays/featuredSlots/maxActiveJobs), so any board's unmapped
 *    plans still get a translated baseline;
 * 3. the wire's freeform authoring description, board-language.
 */
export function planDescription(
  plan: PlanFacts,
  language?: string,
): string | null {
  const facts = plan.featureSummary;
  if (
    plan.purpose === 'talent_access' ||
    plan.purpose === 'job_seeker' ||
    plan.purpose === 'membership' ||
    (facts && facts.maxActiveJobs === 0)
  ) {
    return plan.description ?? null;
  }
  const locale = localeOpt(language);
  const entry = PLAN_LABELS.get(plan.name);
  if (
    plan.description?.trim() &&
    plan.description !== entry?.seedDescription &&
    (locale?.locale ?? getLocale()) === baseLocale
  ) {
    return plan.description;
  }
  if (entry) return entry.description({}, locale);
  if (facts && facts.maxActiveJobs > 0 && facts.durationDays > 0) {
    const listing =
      (!Array.isArray(plan.features) &&
        plan.features?.['jobs.featured_slots']?.value === 'unlimited') ||
      facts.featuredSlots > 0
        ? m.planComposed_featuredListing({ days: facts.durationDays }, locale)
        : m.planComposed_standardListing({ days: facts.durationDays }, locale);
    return facts.maxActiveJobs > 1
      ? `${listing} — ${m.planComposed_maxActiveJobs({ count: facts.maxActiveJobs }, locale)}`
      : listing;
  }
  return plan.description ?? null;
}
