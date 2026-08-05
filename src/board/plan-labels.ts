/**
 * Template-side plan copy localization — same pattern as
 * `custom-field-labels.ts`, but WITHOUT a contract-blessed key: plans carry
 * only freeform operator-authored `name`/`description` (platform follow-up:
 * per-locale plan translations in /v1). Until then, this board's known
 * plans are matched by their authoring NAME; any operator edit simply falls
 * back to the wire copy, so nothing can break — it just un-localizes.
 */
import { m } from '../paraglide/messages';
import { isLocale } from '../paraglide/runtime';

type MessageFn = (
  inputs?: Record<string, never>,
  options?: { locale?: 'de' | 'en' | 'fr' },
) => string;

const PLAN_LABELS: Record<string, { name: MessageFn; description: MessageFn }> =
  {
    Free: { name: m.plan_free_name, description: m.plan_free_description },
    'Featured listing': {
      name: m.plan_featuredListing_name,
      description: m.plan_featuredListing_description,
    },
    'Talent access — monthly': {
      name: m.plan_talentAccessMonthly_name,
      description: m.plan_talentAccessMonthly_description,
    },
  };

function localeOpt(language?: string) {
  return isLocale(language) ? { locale: language } : undefined;
}

/** Localized plan name; wire authoring name as fallback. */
export function planName(
  plan: { name: string },
  language?: string,
): string {
  const entry = PLAN_LABELS[plan.name];
  return entry ? entry.name({}, localeOpt(language)) : plan.name;
}

/** Localized plan description; wire authoring description as fallback. */
export function planDescription(
  plan: { name: string; description?: string | null },
  language?: string,
): string | null {
  const entry = PLAN_LABELS[plan.name];
  if (entry) return entry.description({}, localeOpt(language));
  return plan.description ?? null;
}
