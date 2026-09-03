import { CANDIDATE_PAYWALL_SIGNAL } from './candidate-paywall-error';

export type CandidateLoaderError =
  | 'unauthenticated'
  | 'email-unverified'
  /** The viewer's job-seeker plan does not unlock this feature. */
  | 'paywall-locked';

export function candidateLoaderError<T>(error: T): CandidateLoaderError | null {
  if (!(error instanceof Error)) return null;
  if (error.message.includes('UNAUTHENTICATED')) return 'unauthenticated';
  if (error.message.includes('EMAIL_UNVERIFIED')) return 'email-unverified';
  if (error.message.includes(CANDIDATE_PAYWALL_SIGNAL)) return 'paywall-locked';
  return null;
}
