/**
 * `/alerts/manage` server functions. A digest's manage link carries the
 * subscription and its HMAC manage token; the page keeps both in an
 * httpOnly cookie (src/lib/email-link-cookies.ts) and drops them from the
 * address, which then carries only the cookie's key (`?link=`). Each
 * function here takes that key and uses the subscription and token kept
 * under it. All are POSTs, so neither sits in a URL or an access log.
 * Reading changes nothing: an unsubscribe is a person's click.
 */
import { isNotFound } from '@cavuno/board';
import { createServerFn } from '@tanstack/react-start';

import { getBoard } from '../lib/board';
import { EMAIL_LINK_PREFIXES } from '../lib/email-link-cookies';
import { dottedCodec, emailLink } from './email-link';

import type { JobAlertManageState } from '@cavuno/board';

type Manage = { subscriptionId: string; token: string };

const link = emailLink<Manage>(
  EMAIL_LINK_PREFIXES.alertsManage,
  dottedCodec(
    ({ subscriptionId, token }) => [subscriptionId, token],
    ([subscriptionId, token]) => ({ subscriptionId, token }),
    2,
  ),
);

/**
 * Keeps the link's subscription and token in a cookie, under the key it
 * returns. Null when either is malformed, which is never kept.
 */
export const keepJobAlertManageLink = createServerFn({ method: 'POST' })
  .validator((input: { subscription: string; token: string }) => input)
  .handler(({ data }): string | null =>
    link.keep({ subscriptionId: data.subscription, token: data.token }),
  );

/**
 * The subscription's state; null when the token is valid but no alerts are
 * left (the API reads that as 404, so deleting the last alert lands here);
 * `link_expired` when nothing is kept under `link`. A bad token throws.
 */
export const getJobAlertManageState = createServerFn({ method: 'POST' })
  .validator((input: { link: string }) => input)
  .handler(
    async ({ data }): Promise<JobAlertManageState | null | 'link_expired'> => {
      const manage = link.find(data.link);
      if (!manage) return 'link_expired';
      try {
        const state = await getBoard().jobAlerts.manage({
          subscription: manage.subscriptionId,
          token: manage.token,
        });
        link.renew(data.link);
        return state;
      } catch (error) {
        if (isNotFound(error)) return null;
        throw error;
      }
    },
  );

export const unsubscribeJobAlert = createServerFn({ method: 'POST' })
  .validator((input: { link: string }) => input)
  .handler(({ data }) =>
    link.withValue(data.link, (manage) =>
      getBoard().jobAlerts.unsubscribe(manage),
    ),
  );

export const resubscribeJobAlert = createServerFn({ method: 'POST' })
  .validator((input: { link: string }) => input)
  .handler(({ data }) =>
    link.withValue(data.link, (manage) =>
      getBoard().jobAlerts.resubscribe(manage),
    ),
  );

/** Deletes one alert with its own manage token, from the page's state. */
export const deleteJobAlertPreference = createServerFn({ method: 'POST' })
  .validator(
    (input: { link: string; preferenceId: string; token: string }) => input,
  )
  .handler(({ data }) =>
    link.withValue(data.link, ({ subscriptionId }) =>
      getBoard().jobAlerts.deletePreference({
        subscriptionId,
        preferenceId: data.preferenceId,
        token: data.token,
      }),
    ),
  );
