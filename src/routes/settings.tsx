/**
 * Settings — email notification preferences.
 *
 * Two modes share the route, mirroring the hosted `/settings`:
 *  - signed-in: auth-gated toggles (`board.me.notificationPreferences`).
 *  - email link: a one-click unsubscribe with an HMAC token in the query
 *    (`?boardUserId&channel&token`) — handled in the loader BEFORE the auth
 *    branch, so an unauthenticated recipient is never bounced to sign-in.
 */
import { createFileRoute, isRedirect, Link, redirect } from "@tanstack/react-router";

import { CandidateShell } from "@/components/candidate-shell";
import {
  CandidateRouteErrorPage,
  CandidateRoutePendingPage,
} from "@/components/candidate-route-state";
import { Page, PageContent } from "@/components/layout/page";
import { buttonVariants } from "@/components/ui/button";
import { candidateLoaderError } from "@/lib/candidate-loader-error";
import { candidateSignInHref } from "@/lib/candidate-return-to";
import { NotificationSettings } from "../components/notification-settings";
import { m } from "../paraglide/messages";
import { getNotificationPreferences, unsubscribeWithToken } from "../server/settings";
import { useCandidateShellContext } from "./-candidate-shell-context";

type Channel = "messageEmails" | "applicationEmails";

type Search = {
  token?: string;
  boardUserId?: string;
  channel?: Channel;
};

function asChannel(value: unknown): Channel | undefined {
  return value === "messageEmails" || value === "applicationEmails" ? value : undefined;
}

export const Route = createFileRoute("/settings")({
  staticData: { ownsMain: true },
  pendingComponent: CandidateRoutePendingPage,
  errorComponent: CandidateRouteErrorPage,
  validateSearch: (search: Record<string, unknown>): Search => ({
    token: typeof search.token === "string" ? search.token : undefined,
    boardUserId: typeof search.boardUserId === "string" ? search.boardUserId : undefined,
    channel: asChannel(search.channel),
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    if (deps.token && deps.boardUserId && deps.channel) {
      try {
        await unsubscribeWithToken({
          data: {
            token: deps.token,
            boardUserId: deps.boardUserId,
            channel: deps.channel,
          },
        });
        return { mode: "unsubscribed" as const, channel: deps.channel };
      } catch {
        return { mode: "unsubscribe-failed" as const };
      }
    }
    try {
      const preferences = await getNotificationPreferences();
      return { mode: "settings" as const, preferences: preferences.data };
    } catch (error) {
      if (isRedirect(error)) throw error;
      const authFailure = candidateLoaderError(error);
      if (authFailure === "email-unverified") {
        throw redirect({
          to: "/auth/verify-email-required",
          search: { returnTo: "/settings" },
        });
      }
      if (authFailure === "unauthenticated") {
        throw redirect({ to: "/auth/sign-in", search: { returnTo: "/settings" } });
      }
      throw error;
    }
  },
  head: () => ({ meta: [{ title: m.settings_title() }] }),
  component: SettingsPage,
});

const CHANNEL_NAMES: Record<Channel, () => string> = {
  messageEmails: m.settings_channelMessage,
  applicationEmails: m.settings_channelApplicationUpdate,
};

function SettingsPage() {
  const data = Route.useLoaderData();

  if (data.mode === "unsubscribed") {
    return (
      <Page width="narrow">
        <PageContent>
          <div className="space-y-3 py-10 text-center">
            <h1 className="font-heading text-3xl font-semibold tracking-tight">
              {m.settings_unsubscribedHeading()}
            </h1>
            <p className="text-sm text-muted-foreground">
              {m.settings_unsubscribedBody({ channel: CHANNEL_NAMES[data.channel]() })}
            </p>
            <Link to="/account" className={buttonVariants({ variant: "outline" })}>
              {m.settings_goToAccountLabel()}
            </Link>
          </div>
        </PageContent>
      </Page>
    );
  }

  if (data.mode === "unsubscribe-failed") {
    return (
      <Page width="narrow">
        <PageContent>
          <div className="space-y-3 py-10 text-center">
            <h1 className="font-heading text-3xl font-semibold tracking-tight">
              {m.settings_linkExpiredHeading()}
            </h1>
            <p className="text-sm text-muted-foreground">{m.settings_linkExpiredBody()}</p>
            <a
              href={candidateSignInHref("/settings")}
              className={buttonVariants({ variant: "outline" })}
            >
              {m.settings_signInLabel()}
            </a>
          </div>
        </PageContent>
      </Page>
    );
  }

  // Signed-in mode renders inside the candidate shell; the anonymous
  // unsubscribe-token branches above stay bare (no session, no sidebar).
  return <SignedInSettings preferences={data.preferences} />;
}

function SignedInSettings({
  preferences,
}: {
  preferences: Parameters<typeof NotificationSettings>[0]["preferences"];
}) {
  const candidateShell = useCandidateShellContext();

  return (
    <CandidateShell active="settings" {...candidateShell}>
      <div className="space-y-6">
        <header>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {m.settings_title()}
          </h1>
          <p className="text-sm text-muted-foreground">{m.settings_emailNotificationsText()}</p>
        </header>
        <NotificationSettings preferences={preferences} />
      </div>
    </CandidateShell>
  );
}
