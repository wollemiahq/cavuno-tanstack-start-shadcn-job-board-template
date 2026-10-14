/**
 * Global function middleware: notes the first error a server fn throws
 * during a request, so the server entry can name it when Start answers that
 * request with a `500` (see src/lib/server-error-log.server.ts). The error is
 * rethrown unchanged; this middleware never logs.
 */
import { createMiddleware } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';

import { noteServerError } from './server-error-log.server';

export const serverErrorFunctionMiddleware = createMiddleware({
  type: 'function',
}).server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    noteServerError(error, getRequest());
    throw error;
  }
});
