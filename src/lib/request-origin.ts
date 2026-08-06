import { createIsomorphicFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';

/**
 * This deployment's own origin, with ZERO I/O on either side.
 *
 * `getRootShellData` also returns `origin`, but reading it there couples
 * the caller to a seven-call fan-out (board context, session, SEO, offer
 * gate, employer companies, preview state, paywall grant). The document
 * shell must never wait on that: the whole point of `shellComponent` is
 * that it flushes on the first byte while loaders resolve behind it.
 *
 * So the shell takes origin from route CONTEXT (a `beforeLoad` that just
 * reads the request URL) instead of loader data. That keeps hreflang
 * alternates in the first flush — which is what crawlers read — without
 * making TTFB hostage to the board API.
 */
export const requestOrigin = createIsomorphicFn()
  .server(() => new URL(getRequest().url).origin)
  .client(() => window.location.origin);
