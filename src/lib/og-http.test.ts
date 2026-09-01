import { describe, expect, it } from 'vitest';

import {
  isOgMiss,
  ogNotFoundResponse,
  ogRetrieveFailureResponse,
  ogUnavailableResponse,
} from './og-http';

describe('og HTTP mapping', () => {
  it('treats SDK not-found and {isNotFound:true} as a miss', () => {
    expect(isOgMiss({ isNotFound: true })).toBe(true);
    expect(isOgMiss(new Error('boom'))).toBe(false);
  });

  it('returns HTTP 404 for a miss, never 200 JSON', async () => {
    const response = ogRetrieveFailureResponse({ isNotFound: true });
    expect(response.status).toBe(404);
    expect(await response.text()).toBe('');
  });

  it('returns HTTP 503 for an unexpected retrieve failure so the handler does not 500', () => {
    expect(ogRetrieveFailureResponse(new Error('satori')).status).toBe(503);
    expect(ogUnavailableResponse().status).toBe(503);
    expect(ogNotFoundResponse().status).toBe(404);
  });
});
