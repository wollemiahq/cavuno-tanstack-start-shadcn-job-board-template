/**
 * `/t/*` — first-party Tinybird events proxy (hosted-parity: the Next
 * app rewrites `/t/:path*` to the Tinybird API). flock.js posts page
 * views and custom events here with `data-host="/t"`, so analytics
 * survive ad-blockers and stay same-origin. Plain fetch pass-through —
 * WFP-compatible (cutover runbook P2).
 */
import { createFileRoute } from '@tanstack/react-router';

import { tinybirdProxyTarget } from '../lib/analytics';

async function proxy(request: Request): Promise<Response> {
  const target = tinybirdProxyTarget(new URL(request.url));
  const upstream = await fetch(target, {
    method: request.method,
    headers: {
      'content-type': request.headers.get('content-type') ?? 'text/plain',
    },
    body: request.body,
  });
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'content-type':
        upstream.headers.get('content-type') ?? 'application/json',
    },
  });
}

export const Route = createFileRoute('/t/$')({
  server: {
    handlers: {
      GET: ({ request }) => proxy(request),
      POST: ({ request }) => proxy(request),
    },
  },
});
