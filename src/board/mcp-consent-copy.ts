/**
 * The consent page's copy, worded in the board's language from the facts the
 * Board API gives (`McpConsentStep`): who the assistant is, who stands
 * behind it, and what approving lets it do.
 */
import { m } from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';

import type {
  McpConsentAccountScope,
  McpConsentStep,
  McpConsentSubject,
} from '../server/mcp-consent';
import { boardErrorMessage } from '@/lib/board-error-message';

type ConsentStep = Extract<McpConsentStep, { next: 'consent' }>;

/** The page's heading. */
export function consentHeading(step: ConsentStep, boardName: string): string {
  return m.mcpConsent_heading({ client: step.clientName, board: boardName });
}

/** The trust line: a short label and a sentence under it. */
export type ConsentTrust = { label: string; description: string };

/**
 * Who stands behind the assistant: for a well-known one, where the sign-in
 * goes and who receives it there; for any other, how it registered.
 */
export function consentTrust(step: ConsentStep): ConsentTrust {
  if (step.knownAssistant) {
    return {
      label: m.mcpConsent_trustKnownLabel({ host: step.redirectHost }),
      description: m.mcpConsent_trustKnownText({
        assistant: step.knownAssistant,
      }),
    };
  }
  switch (step.trustLevel) {
    case 'domain_verified':
      return {
        label: m.mcpConsent_trustDomainLabel(),
        description: m.mcpConsent_trustDomainText({
          host: step.publisherHost ?? step.redirectHost,
        }),
      };
    case 'verified':
      return {
        label: m.mcpConsent_trustVerifiedLabel(),
        description: m.mcpConsent_trustVerifiedText(),
      };
    case 'unverified':
      return {
        label: m.mcpConsent_trustUnverifiedLabel(),
        description: m.mcpConsent_trustUnverifiedText(),
      };
  }
}

const SUBJECT_WORD = {
  profiles: m.mcpConsent_subjectProfiles,
  jobs: m.mcpConsent_subjectJobs,
  applicants: m.mcpConsent_subjectApplicants,
} satisfies Record<McpConsentSubject, () => string>;

/** "profiles, jobs and applicants", in the board's language. */
function subjects(list: readonly McpConsentSubject[]): string {
  return new Intl.ListFormat([getLocale()], {
    style: 'long',
    type: 'conjunction',
  }).format(list.map((subject) => SUBJECT_WORD[subject]()));
}

/** What approving lets the assistant do, one paragraph per access. */
export function consentScopes(step: ConsentStep, boardName: string): string[] {
  const { candidate, employer } = step.access;
  const paragraphs: string[] = [];
  if (candidate === 'account') {
    paragraphs.push(m.mcpConsent_candidateAccount());
  } else if (candidate === 'searches') {
    paragraphs.push(m.mcpConsent_candidateSearches({ board: boardName }));
  }
  if (employer) {
    // Reading nothing else still reads which companies they are.
    const reads = employer.reads.length
      ? subjects(employer.reads)
      : m.mcpConsent_subjectNames();
    paragraphs.push(
      employer.changes.length
        ? m.mcpConsent_employerReadsChanges({
            reads,
            changes: subjects(employer.changes),
            board: boardName,
          })
        : m.mcpConsent_employerReads({ reads, board: boardName }),
    );
  }
  return paragraphs;
}

/** Stands in for the emphasised host while the message is split around it. */
const HOST_MARK = '\u{E000}';

/**
 * Where Allow sends the person, for an assistant that isn't a well-known
 * one: the sentence with the host to emphasise as its own part.
 */
export function consentRedirectNotice(
  step: ConsentStep,
): { before: string; host: string; after: string } | null {
  if (step.knownAssistant) return null;
  const text = m.mcpConsent_redirectNotice({
    client: step.clientName.replaceAll(HOST_MARK, ''),
    host: HOST_MARK,
  });
  const [before = '', after = ''] = text.split(HOST_MARK);
  return { before, host: step.redirectHost, after };
}

function noAccountText(
  scopes: readonly McpConsentAccountScope[] | undefined,
  boardName: string,
): string {
  const candidate = scopes?.includes('candidate') ?? true;
  const employer = scopes?.includes('employer') ?? true;
  if (candidate && !employer) {
    return m.mcpConsent_errorNoCandidateAccount({ board: boardName });
  }
  if (employer && !candidate) {
    return m.mcpConsent_errorNoEmployerAccount({ board: boardName });
  }
  return m.mcpConsent_errorNoAccount({ board: boardName });
}

/**
 * Why the person can't connect. A code this site doesn't know yet gets the
 * site's usual wording for an unknown error (`boardErrorMessage`).
 */
export function consentErrorText(
  error: Extract<McpConsentStep, { next: 'error' }>,
  boardName: string,
): string {
  switch (error.code) {
    case 'invalid_link':
      return m.mcpConsent_errorInvalidLink();
    case 'unknown_client':
      return m.mcpConsent_errorUnknownClient();
    case 'client_rejected':
      return m.mcpConsent_errorClientRejected();
    case 'redirect_mismatch':
      return m.mcpConsent_errorRedirectMismatch();
    case 'not_signed_in':
      return m.mcpConsent_errorNotSignedIn({ board: boardName });
    case 'no_account':
      return noAccountText(error.accountScopes, boardName);
    case 'expired':
      return m.mcpConsent_errorExpired();
    case 'unavailable':
      return m.mcpConsent_errorUnavailable();
    default:
      return boardErrorMessage(error);
  }
}
