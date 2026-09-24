/**
 * A board can require job approval. On such a board a free employer post — and
 * an invoice post that publishes on issue — is held as a draft for the operator
 * to publish, and the employer checkout answers `pending_approval` instead of
 * `published`. HTTP 200 therefore does not mean the job is live.
 *
 * The status arrives as a plain string so this keeps working on a board whose
 * pinned `@cavuno/board` generated union predates the member; the API sends it
 * either way.
 */
export function awaitingReview(status: string): boolean {
  return status === 'pending_approval';
}
