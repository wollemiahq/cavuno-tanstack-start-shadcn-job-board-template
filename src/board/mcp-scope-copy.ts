/**
 * What each board MCP scope lets an assistant do, in the board's language:
 * a short label and a sentence, one pair per scope ID. The consent page's
 * picker shows both; the Connected assistants card shows the label.
 */
import { m } from '../paraglide/messages';

type Copy = readonly [label: () => string, description: () => string];

const SCOPE_COPY = {
  candidate: [m.mcpScope_candidateLabel, m.mcpScope_candidateText],
  employer: [m.mcpScope_employerLabel, m.mcpScope_employerText],
  'profile.read': [m.mcpScope_profileReadLabel, m.mcpScope_profileReadText],
  'profile.manage': [
    m.mcpScope_profileManageLabel,
    m.mcpScope_profileManageText,
  ],
  'saved_jobs.manage': [
    m.mcpScope_savedJobsManageLabel,
    m.mcpScope_savedJobsManageText,
  ],
  'alerts.read': [m.mcpScope_alertsReadLabel, m.mcpScope_alertsReadText],
  'alerts.manage': [m.mcpScope_alertsManageLabel, m.mcpScope_alertsManageText],
  'applications.read': [
    m.mcpScope_applicationsReadLabel,
    m.mcpScope_applicationsReadText,
  ],
  'applications.manage': [
    m.mcpScope_applicationsManageLabel,
    m.mcpScope_applicationsManageText,
  ],
  'recommendations.read': [
    m.mcpScope_recommendationsReadLabel,
    m.mcpScope_recommendationsReadText,
  ],
  'access.read': [m.mcpScope_accessReadLabel, m.mcpScope_accessReadText],
  'companies.read': [
    m.mcpScope_companiesReadLabel,
    m.mcpScope_companiesReadText,
  ],
  'companies.manage': [
    m.mcpScope_companiesManageLabel,
    m.mcpScope_companiesManageText,
  ],
  'jobs.read': [m.mcpScope_jobsReadLabel, m.mcpScope_jobsReadText],
  'jobs.manage': [m.mcpScope_jobsManageLabel, m.mcpScope_jobsManageText],
  'jobs.publish': [m.mcpScope_jobsPublishLabel, m.mcpScope_jobsPublishText],
  'applicants.read': [
    m.mcpScope_applicantsReadLabel,
    m.mcpScope_applicantsReadText,
  ],
  'applicants.manage': [
    m.mcpScope_applicantsManageLabel,
    m.mcpScope_applicantsManageText,
  ],
  'billing.read': [m.mcpScope_billingReadLabel, m.mcpScope_billingReadText],
} as const satisfies Record<string, Copy>;

/** The scopes that each cover a whole side of the person's account. */
const UMBRELLA_SCOPES: ReadonlySet<string> = new Set(['candidate', 'employer']);

/**
 * Whether a request names any scope besides `candidate` and `employer`,
 * so the page lists the scopes to tick instead of describing the umbrellas.
 */
export function hasFineScope(ids: readonly string[]): boolean {
  return ids.some((id) => !UMBRELLA_SCOPES.has(id));
}

function isKnownScope(id: string): id is keyof typeof SCOPE_COPY {
  return Object.hasOwn(SCOPE_COPY, id);
}

function copyFor(id: string): Copy | undefined {
  return isKnownScope(id) ? SCOPE_COPY[id] : undefined;
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
  const copy = copyFor(scope.id);
  return copy
    ? { label: copy[0](), description: copy[1]() }
    : { label: scope.label, description: scope.description };
}

/** A granted scope's label; one this site doesn't know yet, by its ID. */
export function scopeLabel(id: string): string {
  return copyFor(id)?.[0]() ?? id;
}
