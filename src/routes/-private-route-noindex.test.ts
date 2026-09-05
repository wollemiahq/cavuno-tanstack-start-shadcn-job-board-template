/**
 * The board's robots.txt is a byte-parity mirror of the hosted board, which
 * allows `/` and only disallows short-link prefixes + listing pagination
 * (see `seo-handlers.ts` + its test). Private, transactional surfaces stay
 * out of the index with per-route `noindex` meta instead — so this frontend
 * must too. These tests pin that every signed-in / auth surface emits
 * `<meta name="robots" content="noindex">` in its `head()`, independent of
 * loader data, so a future refactor cannot quietly expose an account or
 * messages page to crawlers.
 */
import { describe, expect, it } from 'vitest';

import { applicationsHead } from './-me.applications';
import { settingsHead } from './-settings';
import { Route as AccountRoute } from './account';
import { Route as ConfirmEmailChangeRoute } from './auth.confirm-email-change';
import { Route as SignInRoute } from './auth.sign-in';
import { Route as MatchesRoute } from './matches';
import { Route as AlertsRoute } from './me.alerts';
import { Route as MessagesRoute } from './messages';
import { Route as PostCanceledRoute } from './post.checkout-canceled';
import { Route as PostSuccessRoute } from './post.success';
import { Route as SavedRoute } from './saved-jobs';

const privateRouteHeads = [
  ['/account', AccountRoute.options.head?.toString()],
  ['/matches', MatchesRoute.options.head?.toString()],
  ['/saved-jobs', SavedRoute.options.head?.toString()],
  ['/me/applications', applicationsHead(undefined)],
  ['/me/alerts', AlertsRoute.options.head?.toString()],
  ['/messages', MessagesRoute.options.head?.toString()],
  ['/settings', settingsHead(undefined)],
  ['/auth/sign-in', SignInRoute.options.head?.toString()],
  [
    '/auth/confirm-email-change',
    ConfirmEmailChangeRoute.options.head?.toString(),
  ],
  ['/post/success', PostSuccessRoute.options.head?.toString()],
  ['/post/checkout-canceled', PostCanceledRoute.options.head?.toString()],
] as const;

describe('private / transactional routes are noindex (robots.txt stays permissive)', () => {
  it.each(privateRouteHeads)(
    '%s declares a noindex robots directive',
    (_path, headDescriptor) => {
      if (
        Object.prototype.toString.call(headDescriptor) === '[object String]'
      ) {
        expect(headDescriptor).toMatch(
          /name:\s*["']robots["']\s*,\s*content:\s*["']noindex["']/,
        );
        return;
      }
      expect(headDescriptor).toMatchObject({
        meta: expect.arrayContaining([{ name: 'robots', content: 'noindex' }]),
      });
    },
  );
});
