import { expect, it } from 'vitest';

import {
  hasMagicLinkIntent,
  magicLinkIntentCookie,
  matchesMagicLinkIntent,
} from './magic-link-intent';

it('allows automatic sign-in only to the email this browser requested', async () => {
  const cookie = await magicLinkIntentCookie('Owner@Example.com');
  expect(cookie).toContain('HttpOnly; Secure; SameSite=Lax');
  expect(cookie).not.toContain('Owner@Example.com');
  expect(hasMagicLinkIntent(cookie)).toBe(true);
  expect(await matchesMagicLinkIntent(cookie, 'owner@example.com')).toBe(true);
  expect(await matchesMagicLinkIntent(cookie, 'attacker@example.com')).toBe(
    false,
  );
  expect(await matchesMagicLinkIntent(null, 'owner@example.com')).toBe(false);
});
