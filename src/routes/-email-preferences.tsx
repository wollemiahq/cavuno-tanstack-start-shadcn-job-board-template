import { useState } from 'react';

import {
  unsubscribeAllEmailPreferences,
  updateEmailPreferences,
} from '../server/email-preferences';

import type { EmailPreferencesData } from './-email-preferences-loader';
import { Page, PageContent } from '@/components/layout/page';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { m } from '@/paraglide/messages';
import type { EmailPreferences, EmailPreferencesUpdate } from '@cavuno/board';

/** Labels the page's consents with, as the contact's Source. */
const SOURCE = 'email-preferences';

export type EmailPreferencesPageDependencies = {
  updateEmailPreferences: (options: {
    data: { token: string; changes: EmailPreferencesUpdate };
  }) => Promise<EmailPreferences>;
  unsubscribeAllEmailPreferences: (options: {
    data: { token: string };
  }) => Promise<EmailPreferences>;
};

const defaultDependencies: EmailPreferencesPageDependencies = {
  updateEmailPreferences,
  unsubscribeAllEmailPreferences,
};

type PreferenceAlert = EmailPreferences['jobAlerts']['alerts'][number];

function alertLabel(alert: PreferenceAlert) {
  return (
    alert.label ??
    alert.anchorJob?.title ??
    alert.filters.query ??
    m.emailPreferences_alertUntitled()
  );
}

/**
 * Every change is a click that sends only what changed, and the page shows
 * the preferences the API returns, never a hand-patched copy.
 */
export function EmailPreferencesPageView({
  data,
  token,
  dependencies = defaultDependencies,
}: {
  data: EmailPreferencesData;
  token: string | undefined;
  dependencies?: EmailPreferencesPageDependencies;
}) {
  const board = data.seo.boardName;
  const [prefs, setPrefs] = useState(data.prefs);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (!prefs || !token) {
    return (
      <Page width="narrow">
        <PageContent>
          <div className="space-y-2 py-4">
            <h1 className="font-heading text-3xl font-semibold tracking-tight">
              {m.emailPreferences_invalidTitle()}
            </h1>
            <p className="text-muted-foreground">
              {m.emailPreferences_invalidBody({ board })}
            </p>
          </div>
        </PageContent>
      </Page>
    );
  }

  const run = async (action: () => Promise<EmailPreferences>) => {
    setPending(true);
    setFailed(false);
    try {
      setPrefs(await action());
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  };
  const update = (changes: EmailPreferencesUpdate) =>
    run(() =>
      dependencies.updateEmailPreferences({ data: { token, changes } }),
    );

  const marketingConsent = m.emailPreferences_marketingConsent({ board });
  const marketingOn = prefs.marketing.subscribed;
  const { jobAlerts, jobMatches, topics } = prefs;
  const everythingOff =
    (jobAlerts.unsubscribed || jobAlerts.alerts.length === 0) &&
    !jobMatches?.subscribed &&
    !marketingOn;

  return (
    <Page width="narrow">
      <PageContent>
        <div className="space-y-8 py-4">
          <header className="space-y-1">
            <h1 className="font-heading text-3xl font-semibold tracking-tight">
              {m.emailPreferences_title()}
            </h1>
            <p className="text-muted-foreground text-sm">
              {m.emailPreferences_description({ board })}
            </p>
            <p className="text-muted-foreground text-sm">{prefs.email}</p>
          </header>

          {failed ? (
            <Alert variant="destructive">
              <AlertDescription>
                {m.emailPreferences_actionError()}
              </AlertDescription>
            </Alert>
          ) : null}

          <section className="space-y-3" aria-labelledby="ep-job-alerts">
            <h2 id="ep-job-alerts" className="text-lg font-semibold">
              {m.emailPreferences_jobAlertsTitle()}
            </h2>
            {jobAlerts.unsubscribed ? (
              <p className="text-muted-foreground text-sm">
                {m.emailPreferences_jobAlertsOff()}
              </p>
            ) : jobAlerts.alerts.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {m.emailPreferences_jobAlertsNone()}
              </p>
            ) : (
              <ul className="divide-border divide-y rounded-lg border">
                {jobAlerts.alerts.map((alert) => (
                  <li
                    key={alert.id}
                    className="flex items-center justify-between gap-4 p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {alertLabel(alert)}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        {alert.awaitingConfirmation
                          ? m.emailPreferences_alertAwaiting()
                          : m.emailPreferences_alertWeekly()}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pending}
                      aria-label={m.emailPreferences_deleteAlertLabel({
                        label: alertLabel(alert),
                      })}
                      onClick={() =>
                        update({ alerts: [{ id: alert.id, delete: true }] })
                      }
                    >
                      {m.emailPreferences_deleteAlert()}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {jobMatches !== null ? (
            <PreferenceSwitch
              id="ep-job-matches"
              title={m.emailPreferences_jobMatchesTitle()}
              description={
                jobMatches.waitlisted
                  ? m.emailPreferences_jobMatchesWaitlisted({ board })
                  : m.emailPreferences_jobMatchesDescription()
              }
              checked={jobMatches.subscribed}
              disabled={pending}
              onCheckedChange={(checked) => update({ jobMatches: checked })}
            />
          ) : null}

          <PreferenceSwitch
            id="ep-marketing"
            title={m.emailPreferences_marketingTitle()}
            description={marketingConsent}
            checked={marketingOn}
            disabled={pending}
            onCheckedChange={(checked) =>
              update(
                checked
                  ? {
                      marketing: true,
                      consentText: marketingConsent,
                      source: SOURCE,
                    }
                  : { marketing: false },
              )
            }
          />

          {topics.length > 0 ? (
            <section className="space-y-3" aria-labelledby="ep-topics">
              <h2 id="ep-topics" className="text-lg font-semibold">
                {m.emailPreferences_topicsTitle()}
              </h2>
              {!marketingOn ? (
                <p className="text-muted-foreground text-sm">
                  {m.emailPreferences_topicsOffHint()}
                </p>
              ) : null}
              <ul className="space-y-3">
                {topics.map((topic) => (
                  <li key={topic.key}>
                    <PreferenceSwitch
                      id={`ep-topic-${topic.key}`}
                      title={topic.name}
                      // A topic narrows marketing: off with it.
                      checked={marketingOn && topic.subscribed}
                      disabled={pending || !marketingOn}
                      onCheckedChange={(checked) => {
                        const changes: EmailPreferencesUpdate = {
                          topics: [{ key: topic.key, subscribed: checked }],
                        };
                        if (checked) {
                          changes.consentText = m.emailPreferences_topicConsent(
                            { topic: topic.name, board },
                          );
                          changes.source = SOURCE;
                        }
                        void update(changes);
                      }}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {everythingOff ? (
            <Alert role="status">
              <AlertDescription>
                {m.emailPreferences_unsubscribedAll({ board })}
              </AlertDescription>
            </Alert>
          ) : (
            <AlertDialog open={confirming} onOpenChange={setConfirming}>
              <AlertDialogTrigger
                render={<Button variant="outline" disabled={pending} />}
              >
                {m.emailPreferences_unsubscribeAll()}
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {m.emailPreferences_unsubscribeAllTitle()}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {m.emailPreferences_unsubscribeAllBody({ board })}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>
                    {m.emailPreferences_cancel()}
                  </AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    disabled={pending}
                    onClick={() => {
                      setConfirming(false);
                      void run(() =>
                        dependencies.unsubscribeAllEmailPreferences({
                          data: { token },
                        }),
                      );
                    }}
                  >
                    {m.emailPreferences_unsubscribeAllConfirm()}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </PageContent>
    </Page>
  );
}

function PreferenceSwitch({
  id,
  title,
  description,
  checked,
  disabled,
  onCheckedChange,
}: {
  id: string;
  title: string;
  description?: string;
  checked: boolean;
  disabled: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-1">
        <label id={`${id}-label`} htmlFor={id} className="font-medium">
          {title}
        </label>
        {description ? (
          <p id={`${id}-description`} className="text-muted-foreground text-sm">
            {description}
          </p>
        ) : null}
      </div>
      <Switch
        id={id}
        checked={checked}
        disabled={disabled}
        // Base UI's switch is a span, which a <label for> does not name.
        aria-labelledby={`${id}-label`}
        aria-describedby={description ? `${id}-description` : undefined}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}
