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
import { emailLink } from './email-link';

import type { JobAlertManageState } from '@cavuno/board';

const link = emailLink(EMAIL_LINK_PREFIXES.alertsManage);
const PART = /^[A-Za-z0-9_-]+$/;

/** The subscription and token kept under `key`, or null. */
function kept(key: string): { subscriptionId: string; token: string } | null {
  const [subscriptionId, token, extra] = (link.find(key) ?? '').split('.');
  return subscriptionId && token && extra === undefined
    ? { subscriptionId, token }
    : null;
}

async function withKept<T>(
  key: string,
  action: (manage: { subscriptionId: string; token: string }) => Promise<T>,
): Promise<T> {
  const manage = kept(key);
  if (!manage) throw new Error('email_link_expired');
  const result = await action(manage);
  link.renew(key, `${manage.subscriptionId}.${manage.token}`);
  return result;
}

/**
 * Keeps the link's subscription and token in a cookie, under the key it
 * returns. Null when either is malformed, which is never kept.
 */
export const keepJobAlertManageLink = createServerFn({ method: 'POST' })
  .validator((input: { subscription: string; token: string }) => input)
  .handler(({ data }): string | null =>
    PART.test(data.subscription) && PART.test(data.token)
      ? link.keep(`${data.subscription}.${data.token}`)
      : null,
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
      const manage = kept(data.link);
      if (!manage) return 'link_expired';
      try {
        const state = await getBoard().jobAlerts.manage({
          subscription: manage.subscriptionId,
          token: manage.token,
        });
        link.renew(data.link, `${manage.subscriptionId}.${manage.token}`);
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
    withKept(data.link, (manage) => getBoard().jobAlerts.unsubscribe(manage)),
  );

export const resubscribeJobAlert = createServerFn({ method: 'POST' })
  .validator((input: { link: string }) => input)
  .handler(({ data }) =>
    withKept(data.link, (manage) => getBoard().jobAlerts.resubscribe(manage)),
  );

/** Deletes one alert with its own manage token, from the page's state. */
export const deleteJobAlertPreference = createServerFn({ method: 'POST' })
  .validator(
    (input: { link: string; preferenceId: string; token: string }) => input,
  )
  .handler(({ data }) =>
    withKept(data.link, ({ subscriptionId }) =>
      getBoard().jobAlerts.deletePreference({
        subscriptionId,
        preferenceId: data.preferenceId,
        token: data.token,
      }),
    ),
  );
