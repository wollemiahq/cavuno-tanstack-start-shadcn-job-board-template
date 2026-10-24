import { describe, expect, it } from 'vitest';

import {
  matchesOAuthBrowser,
  oauthBrowserCookie,
} from './oauth-browser-binding';

describe('OAuth browser binding', () => {
  it('rejects unsolicited completions and a different browser’s binding', () => {
    expect(matchesOAuthBrowser(null, 'other-browser')).toBe(false);
    expect(
      matchesOAuthBrowser(oauthBrowserCookie('this-browser'), 'other-browser'),
    ).toBe(false);
    expect(
      matchesOAuthBrowser(oauthBrowserCookie('this-browser'), undefined),
    ).toBe(false);
    expect(
      matchesOAuthBrowser(oauthBrowserCookie('this-browser'), 'this-browser'),
    ).toBe(true);
  });
});
