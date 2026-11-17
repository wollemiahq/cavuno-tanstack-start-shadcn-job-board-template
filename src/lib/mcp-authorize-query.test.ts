import { describe, expect, it } from 'vitest';

import {
  mcpAuthorizeRedirect,
  withoutAuthMarkers,
} from './mcp-authorize-query';

describe('mcpAuthorizeRedirect', () => {
  it('leaves other requests to the router', () => {
    for (const request of [
      new Request('https://board.test/oauth/authorize'),
      new Request('https://board.test/oauth/authorize?oauth=abc'),
      new Request('https://board.test/oauth/authorize?state=1', {
        method: 'POST',
      }),
      new Request('https://board.test/jobs?state=1e3'),
    ]) {
      expect(mcpAuthorizeRedirect(request)).toBeNull();
    }
  });

  it('folds a query that carries its own `oauth` value', () => {
    expect(
      mcpAuthorizeRedirect(
        new Request('https://board.test/oauth/authorize?oauth=x&state=1e3'),
      )?.status,
    ).toBe(307);
  });
});

describe('withoutAuthMarkers', () => {
  it('keys the consent loader the same once the tracker strips its markers', () => {
    expect(
      withoutAuthMarkers({
        oauth: 'X',
        cavuno_auth: 'login',
        cavuno_auth_method: 'password',
      }),
    ).toEqual(withoutAuthMarkers({ oauth: 'X' }));
  });
});
