import { isBoardPasswordRequired, isNotFound } from '@cavuno/board';

/**
 * OG image handlers must not leak `{isNotFound:true}` JSON at HTTP 200
 * (`throw notFound()` inside a server GET does that on this stack) and must
 * not 500 when the card renderer throws after a known slug loaded.
 */
export function ogNotFoundResponse(): Response {
  return new Response('', { status: 404 });
}

export function ogUnavailableResponse(): Response {
  return new Response('', { status: 503 });
}

export function isOgMiss(error: unknown): boolean {
  if (isNotFound(error) || isBoardPasswordRequired(error)) return true;
  if (
    error !== null &&
    typeof error === 'object' &&
    'isNotFound' in error &&
    (error as { isNotFound: unknown }).isNotFound === true
  ) {
    return true;
  }
  return false;
}

export function ogRetrieveFailureResponse(error: unknown): Response {
  if (isOgMiss(error)) return ogNotFoundResponse();
  return ogUnavailableResponse();
}
