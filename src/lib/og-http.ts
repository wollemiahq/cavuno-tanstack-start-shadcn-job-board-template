import { isBoardPasswordRequired, isNotFound } from "@cavuno/board";

/**
 * OG image handlers must not leak `{isNotFound:true}` JSON at HTTP 200
 * (`throw notFound()` inside a server GET does that on this stack) and must
 * not 500 when the card renderer throws after a known slug loaded.
 */
export function ogNotFoundResponse(): Response {
  return new Response("", { status: 404 });
}

export function ogUnavailableResponse(): Response {
  return new Response("", { status: 503 });
}

type OgRetrieveFailure = Error | { isNotFound?: boolean };

export function isOgMiss(error: OgRetrieveFailure): boolean {
  if (isNotFound(error) || isBoardPasswordRequired(error)) return true;
  return Object.getOwnPropertyDescriptor(error, "isNotFound")?.value === true;
}

export function ogRetrieveFailureResponse(error: OgRetrieveFailure): Response {
  if (isOgMiss(error)) return ogNotFoundResponse();
  return ogUnavailableResponse();
}
