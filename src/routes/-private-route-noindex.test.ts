/**
 * The board's robots.txt is a byte-parity mirror of the hosted board, which
 * deliberately carries NO `Disallow` lines (see `seo-handlers.ts` + its test).
 * The hosted board keeps its private, transactional surfaces out of the index
 * with per-route `noindex` meta instead — so this frontend must too. These
 * tests pin that every signed-in / auth surface emits
 * `<meta name="robots" content="noindex">` in its `head()`, independent of
 * loader data, so a future refactor cannot quietly expose an account or
 * messages page to crawlers.
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('cloudflare:workers', () => ({ env: {} }));

// These route modules reach the server layer, which imports
// `cloudflare:workers`. The heads under test never call it — only the module
// graph needs it stubbed away.
vi.mock('../server/queries', () => ({
  getSeoBase: vi.fn(),
  getBoardContext: vi.fn(),
}));
vi.mock('../server/account', () => ({ getAccount: vi.fn() }));
vi.mock('../server/settings', () => ({
  getNotificationPreferences: vi.fn(),
  getMarketingConsent: vi.fn(),
  getSettingsAccount: vi.fn(),
  unsubscribeWithToken: vi.fn(),
  requestEmailChange: vi.fn(),
  updatePassword: vi.fn(),
  requestSetPassword: vi.fn(),
}));
vi.mock('../server/applications', () => ({
  getApplications: vi.fn(),
  withdrawApplication: vi.fn(),
}));
vi.mock('../server/auth', () => ({
  getOAuthAuthorizationUrl: vi.fn(),
  requestMagicLink: vi.fn(),
  signIn: vi.fn(),
  forgotPassword: vi.fn(),
  confirmEmailChange: vi.fn(),
}));
vi.mock('@/server/messaging', () => ({
  getBlocked: vi.fn(),
  getInbox: vi.fn(),
}));
vi.mock('../lib/auth-guard', () => ({ redirectIfAuthenticated: vi.fn() }));

import { Route as AccountRoute } from './account';
import { Route as MatchesRoute } from './matches';
import { Route as SavedRoute } from './saved-jobs';
import { Route as ConfirmEmailChangeRoute } from './auth.confirm-email-change';
import { Route as SignInRoute } from './auth.sign-in';
import { Route as AlertsRoute } from './me.alerts';
import { Route as ApplicationsRoute } from './me.applications';
import { Route as MessagesRoute } from './messages';
import { Route as SettingsRoute } from './settings';

/** Extract the robots directive a route's head emits with no loader data. */
function robotsOf(head: unknown): string | undefined {
  if (typeof head !== 'function') throw new Error('route defines no head');
  const result = head({
    loaderData: undefined,
    match: { status: 'success' },
  }) as {
    meta?: Array<{ name?: string; content?: string }>;
  };
  return result.meta?.find((entry) => entry.name === 'robots')?.content;
}

describe('private / transactional routes are noindex (robots.txt stays permissive)', () => {
  it.each([
    ['/account', AccountRoute],
    ['/matches', MatchesRoute],
    ['/saved-jobs', SavedRoute],
    ['/me/applications', ApplicationsRoute],
    ['/me/alerts', AlertsRoute],
    ['/messages', MessagesRoute],
    ['/settings', SettingsRoute],
    ['/auth/sign-in', SignInRoute],
    ['/auth/confirm-email-change', ConfirmEmailChangeRoute],
  ])('%s emits noindex regardless of loader data', (_path, route) => {
    expect(robotsOf(route.options.head)).toBe('noindex');
  });
});
