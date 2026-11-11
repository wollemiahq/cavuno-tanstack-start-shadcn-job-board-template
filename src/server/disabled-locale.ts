/**
 * The board-language URL for a disabled locale's path (see
 * src/lib/disabled-locale-redirect.ts). A server function so the full word
 * file stays out of the client bundle; it reads no board data.
 */
import { createServerFn } from '@tanstack/react-start';

import { disabledLocaleRedirectPath } from '../lib/disabled-locale-redirect';

export const resolveDisabledLocaleRedirect = createServerFn({ method: 'GET' })
  .validator((input: { path: string }) => input)
  .handler(({ data }) => ({ target: disabledLocaleRedirectPath(data.path) }));
