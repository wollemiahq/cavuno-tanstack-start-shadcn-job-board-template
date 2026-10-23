// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';

import { loadMagicLink } from './auth.magic-link';

describe('authentication completion GET', () => {
  it('prepares confirmation without exchanging a token or creating a session', async () => {
    const consumeMagicLink = vi.fn();
    const actions = {
      getSeoBase: vi.fn().mockRejectedValue(new Error('metadata unavailable')),
      consumeMagicLink,
    };
    const result = await loadMagicLink(
      { token: 'unused-token', returnTo: '/account' },
      actions,
    );
    expect(result.status).toBe('ready');
    expect(consumeMagicLink).not.toHaveBeenCalled();
  });

  it('recognizes a stored credential without returning it to the browser', async () => {
    const result = await loadMagicLink(
      { returnTo: '/account' },
      {
        getSeoBase: vi.fn().mockResolvedValue({ boardName: 'Example' }),
        getAuthFlowState: async () => ({ 'magic-link': true }),
      },
    );
    expect(result).toEqual({
      status: 'ready',
      automatic: false,
      seo: { boardName: 'Example' },
    });
  });
});
