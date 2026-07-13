/**
 * A user-facing string for an error caught from a messaging server function.
 * The `BoardApiError` does not survive the TanStack server-fn RPC boundary
 * (see `board-access.ts`), so the client sees a plain `Error` whose message
 * carries the server-side text — fall back to a generic line otherwise.
 */
export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    if (error.message.includes('EMAIL_UNVERIFIED')) {
      return 'Verify your email before sending messages.'
    }
    return error.message
  }
  return 'Something went wrong. Please try again.'
}
