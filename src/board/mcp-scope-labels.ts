/**
 * What each board MCP scope lets an assistant do, as a short label in the
 * board's language, one per scope ID. The Connected assistants card shows
 * it; the consent page's picker shows it beside a sentence
 * (`mcp-scope-copy.ts`), kept out of this module so the card doesn't load
 * the sentences.
 */
import { m } from '../paraglide/messages';

export const SCOPE_LABELS = {
  candidate: m.mcpScope_candidateLabel,
  employer: m.mcpScope_employerLabel,
  'profile.read': m.mcpScope_profileReadLabel,
  'profile.manage': m.mcpScope_profileManageLabel,
  'saved_jobs.manage': m.mcpScope_savedJobsManageLabel,
  'alerts.read': m.mcpScope_alertsReadLabel,
  'alerts.manage': m.mcpScope_alertsManageLabel,
  'applications.read': m.mcpScope_applicationsReadLabel,
  'applications.manage': m.mcpScope_applicationsManageLabel,
  'recommendations.read': m.mcpScope_recommendationsReadLabel,
  'access.read': m.mcpScope_accessReadLabel,
  'companies.read': m.mcpScope_companiesReadLabel,
  'companies.manage': m.mcpScope_companiesManageLabel,
  'jobs.read': m.mcpScope_jobsReadLabel,
  'jobs.manage': m.mcpScope_jobsManageLabel,
  'jobs.publish': m.mcpScope_jobsPublishLabel,
  'applicants.read': m.mcpScope_applicantsReadLabel,
  'applicants.manage': m.mcpScope_applicantsManageLabel,
  'billing.read': m.mcpScope_billingReadLabel,
} as const satisfies Record<string, () => string>;

export type KnownScope = keyof typeof SCOPE_LABELS;

export function isKnownScope(id: string): id is KnownScope {
  return Object.hasOwn(SCOPE_LABELS, id);
}

/** A granted scope's label; one this site doesn't know yet, by its ID. */
export function scopeLabel(id: string): string {
  return isKnownScope(id) ? SCOPE_LABELS[id]() : id;
}
