/**
 * Mount contract for `/apply`. The intent seam's own suite pins the POST
 * semantics; this pins that a GET never falls through to the SPA shell.
 * Before the GET handler existed, `GET /apply` was a blank 200 on every
 * board — indexable, uncanonicalised, and the page a candidate saw after
 * backing out of an external apply.
 */
import { describe, expect, it } from 'vitest';

import { Route } from './apply';

function getHandler() {
  const handlers = Route.options.server?.handlers;
  if (!handlers || !('GET' in handlers) || !handlers.GET) {
    throw new Error('expected /apply to export a GET server handler');
  }
  return handlers.GET;
}

async function getApply(path: string): Promise<Response> {
  const request = new Request(`https://board.example.com${path}`);
  const result = await getHandler()({
    context: undefined,
    request,
    params: {},
    pathname: '/apply',
    next: () => {
      throw new Error('The /apply GET handler must not defer');
    },
  });
  if (!(result instanceof Response)) {
    throw new Error('The /apply GET handler must return a response');
  }
  return result;
}

describe('/apply GET', () => {
  it('redirects to the listing instead of serving the shell', async () => {
    const res = await getApply('/apply');
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/jobs');
  });

  it('is never cached or indexed', async () => {
    const res = await getApply('/apply?jobSlug=x');
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(res.headers.get('x-robots-tag')).toBe('noindex, nofollow');
  });

  it('keeps the locale prefix so a German visitor lands on /de/jobs', async () => {
    const res = await getApply('/de/apply');
    expect(res.headers.get('location')).toBe('/de/jobs');
  });
});
