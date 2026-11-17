/**
 * Settings — email notification preferences.
 *
 * Two modes share the route, mirroring the hosted `/settings`:
 *  - signed-in: auth-gated toggles (`board.me.notificationPreferences`).
 *  - email link: an unsubscribe with an HMAC token in the query
 *    (`?boardUserId&channel&token`), handled in the loader BEFORE the auth
 *    branch, so an unauthenticated recipient is never bounced to sign-in.
 *    The loader keeps the three in an httpOnly cookie and opens the page
 *    again with only its key (`?link=`). Opening the link changes nothing,
 *    because link checkers open every link in a message: the page offers
 *    one Unsubscribe button, and the person's click unsubscribes.
 */
import { useState } from 'react';

import { isBoardApiError } from '@cavuno/board';
import { isRedirect, Link, redirect } from '@tanstack/react-router';

import { DangerZone } from '../components/danger-zone';
import { MarketingConsentSettings } from '../components/marketing-consent-settings';
import { NotificationSettings } from '../components/notification-settings';
import { SettingsEmailCard } from '../components/settings-email-card';
import { SettingsPasswordCard } from '../components/settings-password-card';
import { MARKETING_CONSENT } from '../lib/marketing-consent';
import { m } from '../paraglide/messages';
import { getSeoBase } from '../server/queries';
import {
  getMarketingConsent,
  getNotificationPreferences,
  getSettingsAccount,
  getUnsubscribeLinkChannel,
  keepUnsubscribeLink,
  requestEmailChange,
  requestSetPassword,
  unsubscribeWithLink,
  updateNotificationPreference,
  updatePassword,
  type StarterUnsubscribeBody,
  type StarterUpdateNotificationPreferenceBody,
} from '../server/settings';

import { CandidateShell } from '@/components/candidate-shell';
import { Page, PageContent } from '@/components/layout/page';
import { Text } from '@/components/text';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  incomingAuthSearch,
  mergeAuthConversionSearch,
  type LocationAuthSearch,
} from '@/lib/board-datalayer-events';
import { candidateLoaderError } from '@/lib/candidate-loader-error';
import { candidateAuthSearch } from '@/lib/candidate-return-to';
import { headTitle } from '@/lib/page-title';

type Channel = 'messageEmails' | 'applicationEmails' | 'recommendedJobEmails';

/**
 * `token`, `boardUserId` and `channel` come from the email link and leave
 * the address at once; `link` is the key of the cookie that keeps them.
 */
export type SettingsSearch = {
  token?: string;
  boardUserId?: string;
  channel?: Channel;
  link?: string;
};

export type SettingsRouteDependencies = {
  getMarketingConsent: () => ReturnType<typeof getMarketingConsent>;
  getNotificationPreferences: () => ReturnType<
    typeof getNotificationPreferences
  >;
  getSeoBase: () => Promise<{ boardName: string }>;
  getSettingsAccount: () => ReturnType<typeof getSettingsAccount>;
  getUnsubscribeLinkChannel: (options: {
    data: { link: string };
  }) => Promise<Channel | null>;
  keepUnsubscribeLink: (options: {
    data: StarterUnsubscribeBody;
  }) => Promise<string | null>;
  requestEmailChange: (options: {
    data: { email: string };
  }) => ReturnType<typeof requestEmailChange>;
  requestSetPassword: (options: {
    data: { email: string };
  }) => ReturnType<typeof requestSetPassword>;
  unsubscribeWithLink: (options: {
    data: { link: string };
  }) => ReturnType<typeof unsubscribeWithLink>;
  updateNotificationPreference: (options: {
    data: StarterUpdateNotificationPreferenceBody;
  }) => ReturnType<typeof updateNotificationPreference>;
  updatePassword: (options: {
    data: { currentPassword: string; newPassword: string };
  }) => ReturnType<typeof updatePassword>;
};

export const settingsRouteDependencies: SettingsRouteDependencies = {
  getMarketingConsent,
  getNotificationPreferences,
  getSeoBase,
  getSettingsAccount,
  getUnsubscribeLinkChannel,
  keepUnsubscribeLink,
  requestEmailChange,
  requestSetPassword,
  unsubscribeWithLink,
  updateNotificationPreference,
  updatePassword,
};

/**
 * In `?link=` for a malformed email link, which is never kept. Any `?link`
 * means the email-link branch (no `?link` is signed-in settings), and this
 * one is never a cookie key (16 hex characters), so it reads as expired.
 */
const INVALID_LINK = 'invalid';

export function createSettingsLoader(
  dependencies: SettingsRouteDependencies = settingsRouteDependencies,
) {
  return async ({
    deps,
    location,
  }: {
    deps: SettingsSearch;
    location?: LocationAuthSearch;
  }) => {
    if (deps.token && deps.boardUserId && deps.channel) {
      const link = await dependencies.keepUnsubscribeLink({
        data: {
          token: deps.token,
          boardUserId: deps.boardUserId,
          channel: deps.channel,
        },
      });
      throw redirect({
        to: '/settings',
        search: { link: link ?? INVALID_LINK },
        replace: true,
      });
    }
    const seo = await dependencies.getSeoBase();
    if (deps.link !== undefined) {
      // Nothing kept under the key (an hour passed, cookies are blocked,
      // or the link was malformed): the page says the link has expired.
      const channel = await dependencies.getUnsubscribeLinkChannel({
        data: { link: deps.link },
      });
      return channel
        ? { mode: 'unsubscribe' as const, channel, link: deps.link, seo }
        : { mode: 'unsubscribe-failed' as const, seo };
    }
    try {
      const [preferences, consent, account] = await Promise.all([
        dependencies.getNotificationPreferences(),
        dependencies.getMarketingConsent(),
        dependencies.getSettingsAccount(),
      ]);
      return {
        mode: 'settings' as const,
        preferences: preferences.data,
        consent,
        account,
        seo,
      };
    } catch (error) {
      if (isRedirect(error)) throw error;
      const authFailure = candidateLoaderError(error);
      if (authFailure === 'email-unverified') {
        throw redirect({
          to: '/auth/verify-email-required',
          search: mergeAuthConversionSearch(
            { returnTo: '/settings' },
            incomingAuthSearch(location),
          ),
        });
      }
      if (authFailure === 'unauthenticated') {
        throw redirect({
          to: '/auth/sign-in',
          search: { returnTo: '/settings' },
        });
      }
      throw error;
    }
  };
}

export function settingsHead(
  loaderData: { seo: { boardName: string } } | undefined,
) {
  return {
    meta: [
      { title: headTitle(loaderData?.seo.boardName, m.settings_title()) },
      { name: 'robots', content: 'noindex' },
    ],
  };
}

type SettingsAccount = {
  email: string;
  hasPassword?: unknown;
  role: 'candidate' | 'employer';
};

type ChannelNames = Record<Channel, () => string>;

const CHANNEL_NAMES = {
  messageEmails: m.settings_channelMessage,
  applicationEmails: m.settings_channelApplicationUpdate,
  recommendedJobEmails: m.settings_channelRecommendedJobs,
} satisfies ChannelNames;

export function SettingsPageView({
  data,
  jobRecommendationsEnabled = true,
  dependencies = settingsRouteDependencies,
}: {
  data:
    | { mode: 'unsubscribe'; channel: Channel; link: string }
    | { mode: 'unsubscribe-failed' }
    | {
        mode: 'settings';
        preferences: Parameters<typeof NotificationSettings>[0]['preferences'];
        consent: Parameters<typeof MarketingConsentSettings>[0]['consent'];
        account: SettingsAccount;
      };
  jobRecommendationsEnabled?: boolean;
  dependencies?: SettingsRouteDependencies;
}) {
  if (data.mode === 'unsubscribe') {
    return (
      <UnsubscribeLinkPage
        channel={data.channel}
        link={data.link}
        dependencies={dependencies}
      />
    );
  }

  if (data.mode === 'unsubscribe-failed') return <LinkExpiredPage />;

  // Signed-in mode renders inside the candidate shell; the anonymous
  // unsubscribe-token branches above stay bare (no session, no sidebar).
  return (
    <SignedInSettings
      preferences={data.preferences}
      consent={data.consent}
      account={data.account}
      jobRecommendationsEnabled={jobRecommendationsEnabled}
      dependencies={dependencies}
    />
  );
}

/**
 * The link can't unsubscribe: it was malformed or expired, or the API
 * refused it. Signing in reaches the same settings, so it's never a dead
 * end. `alert` announces it when it replaces the button after a tap.
 */
function LinkExpiredPage({ alert = false }: { alert?: boolean }) {
  return (
    <Page width="narrow">
      <PageContent>
        <div
          role={alert ? 'alert' : undefined}
          className="space-y-3 py-10 text-center"
        >
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            {m.settings_linkExpiredHeading()}
          </h1>
          <p className="text-muted-foreground text-sm">
            {m.settings_linkExpiredBody()}
          </p>
          <Link
            to="/auth/sign-in"
            search={candidateAuthSearch('/settings')}
            className={buttonVariants({ variant: 'outline' })}
          >
            {m.settings_signInLabel()}
          </Link>
        </div>
      </PageContent>
    </Page>
  );
}

/**
 * The email's Unsubscribe link: one button, which unsubscribes on the
 * person's click and then says so.
 */
function UnsubscribeLinkPage({
  channel,
  link,
  dependencies,
}: {
  channel: Channel;
  link: string;
  dependencies: SettingsRouteDependencies;
}) {
  const [state, setState] = useState<
    'idle' | 'pending' | 'done' | 'refused' | 'retry'
  >('idle');
  const channelName = CHANNEL_NAMES[channel]();
  if (state === 'refused') return <LinkExpiredPage alert />;
  const unsubscribe = async () => {
    setState('pending');
    try {
      await dependencies.unsubscribeWithLink({ data: { link } });
      setState('done');
    } catch (error) {
      // The link can't work when its cookie is gone or the API refused it
      // (a wrong or tampered token, or a deleted person): any 4xx but 429.
      // A 429, a 5xx or a lost connection can be tried again.
      const refused = isBoardApiError(error)
        ? error.status >= 400 && error.status < 500 && error.status !== 429
        : error instanceof Error && error.message === 'email_link_expired';
      setState(refused ? 'refused' : 'retry');
    }
  };

  return (
    <Page width="narrow">
      <PageContent>
        <div className="space-y-3 py-10 text-center">
          {state === 'done' ? (
            <div role="status" className="space-y-3">
              <h1 className="font-heading text-3xl font-semibold tracking-tight">
                {m.settings_unsubscribedHeading()}
              </h1>
              <p className="text-muted-foreground text-sm">
                {m.settings_unsubscribedBody({ channel: channelName })}
              </p>
              <Link
                to="/account"
                className={buttonVariants({ variant: 'outline' })}
              >
                {m.settings_goToAccountLabel()}
              </Link>
            </div>
          ) : (
            <>
              <h1 className="font-heading text-3xl font-semibold tracking-tight">
                {m.settings_emailNotificationsText()}
              </h1>
              <Button disabled={state === 'pending'} onClick={unsubscribe}>
                {m.settings_unsubscribeCta({ channel: channelName })}
              </Button>
              {state === 'retry' ? (
                <p role="alert" className="text-destructive text-sm">
                  {m.alertsManage_actionErrorText()}
                </p>
              ) : null}
            </>
          )}
        </div>
      </PageContent>
    </Page>
  );
}

function accountHasPassword(account: { hasPassword?: unknown }): boolean {
  return account.hasPassword === true;
}

function SignedInSettings({
  preferences,
  consent,
  account,
  jobRecommendationsEnabled,
  dependencies,
}: {
  preferences: Parameters<typeof NotificationSettings>[0]['preferences'];
  consent: Parameters<typeof MarketingConsentSettings>[0]['consent'];
  account: SettingsAccount;
  jobRecommendationsEnabled: boolean;
  dependencies: SettingsRouteDependencies;
}) {
  return (
    <CandidateShell>
      <div className="space-y-6">
        <header>
          <Text as="h1" variant="heading1">
            {m.settings_title()}
          </Text>
        </header>
        <section className="space-y-3">
          <h2 className="font-heading text-base font-medium">
            {m.settings_emailNotificationsText()}
          </h2>
          <NotificationSettings
            preferences={preferences}
            role={account.role}
            recommendedJobEmailsEnabled={jobRecommendationsEnabled}
            updatePreference={dependencies.updateNotificationPreference}
          />
          {MARKETING_CONSENT.notificationPreferences ? (
            <MarketingConsentSettings consent={consent} />
          ) : null}
        </section>
        <SettingsEmailCard
          currentEmail={account.email}
          requestChange={dependencies.requestEmailChange}
        />
        <SettingsPasswordCard
          hasPassword={accountHasPassword(account)}
          email={account.email}
          requestPassword={dependencies.requestSetPassword}
          updateCurrentPassword={dependencies.updatePassword}
        />
        <DangerZone />
      </div>
    </CandidateShell>
  );
}
