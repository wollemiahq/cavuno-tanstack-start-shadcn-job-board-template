import { BoardApiError, isBoardApiError } from '@cavuno/board';
import { createSerializationAdapter } from '@tanstack/react-router';

/**
 * Keeps a `BoardApiError` a `BoardApiError` across the server-fn boundary.
 *
 * Without it, Start serializes any thrown error as a generic `Error` that
 * carries only `message`, so after a client-side navigation every loader's
 * `isNotFound(error)` was false: an expired job link clicked inside the app
 * rendered "Something went wrong" instead of the not-found page, while the
 * same URL loaded directly (server-side, no serialization) 404'd correctly.
 *
 * Only the fields client code branches on cross the wire. `raw` (the whole
 * response body, an HTML page for an edge refusal) and `details` (read only
 * by server functions) stay on the server.
 */
export const boardApiErrorAdapter = createSerializationAdapter({
  key: 'cavuno-board-api-error',
  test: isBoardApiError,
  toSerializable: (error) => ({
    status: error.status,
    code: error.code,
    message: error.message,
    requestId: error.requestId ?? null,
  }),
  fromSerializable: (wire) =>
    new BoardApiError({
      status: wire.status,
      code: wire.code,
      message: wire.message,
      requestId: wire.requestId ?? undefined,
      raw: undefined,
    }),
});
