import { describe, expect, it } from 'vitest';

import { authFlowToken, captureAuthFlow } from './auth-flow';

describe('credential landing URLs', () => {
  it.each([
    'magic-link',
    'oauth-complete',
    'reset-password',
    'confirm-email-change',
  ] as const)(
    'moves %s credentials into an httpOnly cookie before rendering',
    (kind) => {
      const response = captureAuthFlow(
        new Request(
          `https://board.example/auth/${kind}?token=secret-token&returnTo=%2Faccount`,
        ),
      );
      expect(response?.status).toBe(303);
      expect(response?.headers.get('location')).toBe(
        `/auth/${kind}?returnTo=%2Faccount`,
      );
      expect(response?.headers.get('referrer-policy')).toBe('no-referrer');
      const cookie = response?.headers.get('set-cookie');
      expect(cookie).toContain('HttpOnly; Secure; SameSite=Lax');
      expect(authFlowToken(cookie, kind)).toBe('secret-token');
    },
  );
  it('leaves clean URLs and unrelated token parameters alone', () => {
    expect(
      captureAuthFlow(new Request('https://board.example/auth/reset-password')),
    ).toBeNull();
    expect(
      captureAuthFlow(new Request('https://board.example/jobs?token=filter')),
    ).toBeNull();
  });
  it.each([
    '/AUTH/reset-password',
    '/%61uth/reset-password',
    '/auth/reset-password/',
  ])('cleans credentials from router-accepted URL variant %s', (path) => {
    const response = captureAuthFlow(
      new Request(`https://board.example${path}?token=secret-token`),
    );
    expect(response?.status).toBe(303);
    expect(response?.headers.get('location')).not.toContain('secret-token');
    expect(
      authFlowToken(response?.headers.get('set-cookie'), 'reset-password'),
    ).toBe('secret-token');
  });
});
