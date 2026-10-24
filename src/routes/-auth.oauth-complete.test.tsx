// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';

import { loadOAuthComplete } from './auth.oauth-complete';

describe('authentication completion GET', () => {
  it('prepares confirmation without exchanging a token or creating a session', async () => {
    const exchangeOAuth = vi.fn();
    const actions = {
      getSeoBase: vi.fn().mockRejectedValue(new Error('metadata unavailable')),
      exchangeOAuth,
    };
    const result = await loadOAuthComplete(
      { token: 'unused-token', returnTo: '/account' },
      actions,
    );
    expect(result.status).toBe('ready');
    expect(exchangeOAuth).not.toHaveBeenCalled();
  });

  it('recognizes a stored credential without returning it to the browser', async () => {
    const result = await loadOAuthComplete(
      { returnTo: '/account' },
      {
        getSeoBase: vi.fn().mockResolvedValue({ boardName: 'Example' }),
        getAuthFlowState: async () => ({ 'oauth-complete': true }),
      },
    );
    expect(result).toEqual({ status: 'ready', seo: { boardName: 'Example' } });
  });
});
