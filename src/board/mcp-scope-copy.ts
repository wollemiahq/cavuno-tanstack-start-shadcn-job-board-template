/**
 * What each board MCP scope lets an assistant do, in the board's language,
 * for the consent page's picker: its label (`mcp-scope-labels.ts`) and a
 * sentence, one per scope ID.
 */
import { m } from '../paraglide/messages';
import {
  isKnownScope,
  type KnownScope,
  SCOPE_LABELS,
} from './mcp-scope-labels';

const SCOPE_DESCRIPTIONS = {
  candidate: m.mcpScope_candidateText,
  employer: m.mcpScope_employerText,
  'profile.read': m.mcpScope_profileReadText,
  'profile.manage': m.mcpScope_profileManageText,
  'saved_jobs.manage': m.mcpScope_savedJobsManageText,
  'alerts.read': m.mcpScope_alertsReadText,
  'alerts.manage': m.mcpScope_alertsManageText,
  'applications.read': m.mcpScope_applicationsReadText,
  'applications.manage': m.mcpScope_applicationsManageText,
  'recommendations.read': m.mcpScope_recommendationsReadText,
  'access.read': m.mcpScope_accessReadText,
  'companies.read': m.mcpScope_companiesReadText,
  'companies.manage': m.mcpScope_companiesManageText,
  'jobs.read': m.mcpScope_jobsReadText,
  'jobs.manage': m.mcpScope_jobsManageText,
  'jobs.publish': m.mcpScope_jobsPublishText,
  'applicants.read': m.mcpScope_applicantsReadText,
  'applicants.manage': m.mcpScope_applicantsManageText,
  'billing.read': m.mcpScope_billingReadText,
} as const satisfies Record<KnownScope, () => string>;

/** The scopes that each cover a whole side of the person's account. */
const UMBRELLA_SCOPES: ReadonlySet<string> = new Set(['candidate', 'employer']);

/**
 * Whether a request names any scope besides `candidate` and `employer`,
 * so the page lists the scopes to tick instead of describing the umbrellas.
 */
export function hasFineScope(ids: readonly string[]): boolean {
  return ids.some((id) => !UMBRELLA_SCOPES.has(id));
}

/**
 * A requested scope's label and description. A scope this site doesn't
 * know yet keeps the Board API's English wording.
 */
export function scopeCopy(scope: {
  id: string;
  label: string;
  description: string;
}): { label: string; description: string } {
  return isKnownScope(scope.id)
    ? {
        label: SCOPE_LABELS[scope.id](),
        description: SCOPE_DESCRIPTIONS[scope.id](),
      }
    : { label: scope.label, description: scope.description };
}
