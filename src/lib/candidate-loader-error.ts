export type CandidateLoaderError = 'unauthenticated' | 'email-unverified';

export function candidateLoaderError<T>(error: T): CandidateLoaderError | null {
  if (!(error instanceof Error)) return null;
  if (error.message.includes('UNAUTHENTICATED')) return 'unauthenticated';
  if (error.message.includes('EMAIL_UNVERIFIED')) return 'email-unverified';
  return null;
}
