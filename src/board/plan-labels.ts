/**
 * Template-side plan copy localization — same pattern as
 * `custom-field-labels.ts`, but WITHOUT a contract-blessed key: plans carry
 * only freeform operator-authored `name`/`description` (platform follow-up:
 * per-locale plan translations in /v1). Until then, this board's known
 * plans are matched by their authoring NAME; any operator edit simply falls
 * back to the wire copy, so nothing can break — it just un-localizes.
 */
import { m } from '../paraglide/messages';
import { isLocale, type Locale } from '../paraglide/runtime';

type MessageFn = (
  inputs?: Record<string, never>,
  options?: { locale?: Locale },
) => string;

interface PlanLabelEntry {
  name: MessageFn;
  description: MessageFn;
}

const PLAN_LABELS = new Map<string, PlanLabelEntry>([
  ['Free', { name: m.plan_free_name, description: m.plan_free_description }],
  [
    'Featured listing',
    {
      name: m.plan_featuredListing_name,
      description: m.plan_featuredListing_description,
    },
  ],
  [
    'Talent access — monthly',
    {
      name: m.plan_talentAccessMonthly_name,
      description: m.plan_talentAccessMonthly_description,
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
  featureSummary?: {
    durationDays: number;
    maxActiveJobs: number;
    featuredSlots: number;
  } | null;
}

/**
 * Localized plan description, three tiers:
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
  const entry = PLAN_LABELS.get(plan.name);
  if (entry) return entry.description({}, localeOpt(language));
  const facts = plan.featureSummary;
  if (facts && facts.durationDays > 0) {
    const locale = localeOpt(language);
    const listing =
      facts.featuredSlots > 0
        ? m.planComposed_featuredListing({ days: facts.durationDays }, locale)
        : m.planComposed_standardListing({ days: facts.durationDays }, locale);
    return facts.maxActiveJobs > 1
      ? `${listing} — ${m.planComposed_maxActiveJobs(
          { count: facts.maxActiveJobs },
          locale,
        )}`
      : listing;
  }
  return plan.description ?? null;
}
