/**
 * Settings — email notification preferences.
 *
 * Two modes share the route, mirroring the hosted `/settings`:
 *  - signed-in: auth-gated toggles (`board.me.notificationPreferences`).
 *  - email link: a one-click unsubscribe with an HMAC token in the query
 *    (`?boardUserId&channel&token`) — handled in the loader BEFORE the auth
 *    branch, so an unauthenticated recipient is never bounced to sign-in.
 */
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
  requestEmailChange,
  requestSetPassword,
  unsubscribeWithToken,
  updateNotificationPreference,
  updatePassword,
  type StarterUnsubscribeBody,
  type StarterUpdateNotificationPreferenceBody,
} from '../server/settings';

import { CandidateShell } from '@/components/candidate-shell';
import { Page, PageContent } from '@/components/layout/page';
import { Text } from '@/components/text';
import { buttonVariants } from '@/components/ui/button';
import {
  incomingAuthSearch,
  mergeAuthConversionSearch,
  type LocationAuthSearch,
} from '@/lib/board-datalayer-events';
import { candidateLoaderError } from '@/lib/candidate-loader-error';
import { candidateSignInHref } from '@/lib/candidate-return-to';
import { headTitle } from '@/lib/page-title';

type Channel = 'messageEmails' | 'applicationEmails' | 'recommendedJobEmails';

export type SettingsSearch = {
  token?: string;
  boardUserId?: string;
  channel?: Channel;
};

export type SettingsRouteDependencies = {
  getMarketingConsent: () => ReturnType<typeof getMarketingConsent>;
  getNotificationPreferences: () => ReturnType<
    typeof getNotificationPreferences
  >;
  getSeoBase: () => Promise<{ boardName: string }>;
  getSettingsAccount: () => ReturnType<typeof getSettingsAccount>;
  requestEmailChange: (options: {
    data: { email: string };
  }) => ReturnType<typeof requestEmailChange>;
  requestSetPassword: (options: {
    data: { email: string };
  }) => ReturnType<typeof requestSetPassword>;
  unsubscribeWithToken: (options: {
    data: StarterUnsubscribeBody;
  }) => ReturnType<typeof unsubscribeWithToken>;
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
  requestEmailChange,
  requestSetPassword,
  unsubscribeWithToken,
  updateNotificationPreference,
  updatePassword,
};

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
    const seo = await dependencies.getSeoBase();
    if (deps.token && deps.boardUserId && deps.channel) {
      try {
        await dependencies.unsubscribeWithToken({
          data: {
            token: deps.token,
            boardUserId: deps.boardUserId,
            channel: deps.channel,
          },
        });
        return { mode: 'unsubscribed' as const, channel: deps.channel, seo };
      } catch {
        return { mode: 'unsubscribe-failed' as const, seo };
      }
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

type ChannelNames = Record<Channel, () => string>;

const CHANNEL_NAMES = {
  messageEmails: m.settings_channelMessage,
  applicationEmails: m.settings_channelApplicationUpdate,
  recommendedJobEmails: m.notificationSettings_recommendedJobEmailsTitle,
} satisfies ChannelNames;

export function SettingsPageView({
  data,
  jobRecommendationsEnabled = true,
  dependencies = settingsRouteDependencies,
}: {
  data:
    | { mode: 'unsubscribed'; channel: Channel }
    | { mode: 'unsubscribe-failed' }
    | {
        mode: 'settings';
        preferences: Parameters<typeof NotificationSettings>[0]['preferences'];
        consent: Parameters<typeof MarketingConsentSettings>[0]['consent'];
        account: { email: string; hasPassword?: unknown };
      };
  jobRecommendationsEnabled?: boolean;
  dependencies?: SettingsRouteDependencies;
}) {
  if (data.mode === 'unsubscribed') {
    return (
      <Page width="narrow">
        <PageContent>
          <div className="space-y-3 py-10 text-center">
            <h1 className="font-heading text-3xl font-semibold tracking-tight">
              {m.settings_unsubscribedHeading()}
            </h1>
            <p className="text-muted-foreground text-sm">
              {m.settings_unsubscribedBody({
                channel: CHANNEL_NAMES[data.channel](),
              })}
            </p>
            <Link
              to="/account"
              className={buttonVariants({ variant: 'outline' })}
            >
              {m.settings_goToAccountLabel()}
            </Link>
          </div>
        </PageContent>
      </Page>
    );
  }

  if (data.mode === 'unsubscribe-failed') {
    return (
      <Page width="narrow">
        <PageContent>
          <div className="space-y-3 py-10 text-center">
            <h1 className="font-heading text-3xl font-semibold tracking-tight">
              {m.settings_linkExpiredHeading()}
            </h1>
            <p className="text-muted-foreground text-sm">
              {m.settings_linkExpiredBody()}
            </p>
            <Link
              to={candidateSignInHref('/settings')}
              className={buttonVariants({ variant: 'outline' })}
            >
              {m.settings_signInLabel()}
            </Link>
          </div>
        </PageContent>
      </Page>
    );
  }

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
  account: { email: string; hasPassword?: unknown };
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
