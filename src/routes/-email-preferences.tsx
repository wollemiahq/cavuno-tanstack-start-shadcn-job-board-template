import { useState } from 'react';

import { isBoardApiError } from '@cavuno/board';

import {
  emailPreferencesDependencies,
  type EmailPreferencesData,
  type EmailPreferencesDependencies,
} from './-email-preferences-loader';

import { jobAlertMatch, searchKeywordsText } from '@/board/job-alert-match';
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
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from '@/components/ui/field';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@/components/ui/item';
import { Switch } from '@/components/ui/switch';
import { m } from '@/paraglide/messages';
import type { EmailPreferences, EmailPreferencesUpdate } from '@cavuno/board';

/** Recorded as the consent's `source`. */
const SOURCE = 'email-preferences';

type PreferenceAlert = EmailPreferences['jobAlerts']['alerts'][number];

/** The alert's own name, else what it matches, as `/alerts/manage` says it. */
function alertLabel(alert: PreferenceAlert) {
  if (alert.label) return alert.label;
  const match = jobAlertMatch(alert);
  if (match.kind === 'similar_job') {
    return match.anchorJob
      ? m.jobAlertMatch_similarTo({ title: match.anchorJob.title })
      : m.alertManager_similarJobsAlertLabel();
  }
  return searchKeywordsText(match) ?? m.alertsManage_allJobsText();
}

/**
 * Every change is a click that sends only what changed, and the page shows
 * the preferences the API returns, never a hand-patched copy.
 */
export function EmailPreferencesPageView({
  data,
  dependencies = emailPreferencesDependencies,
}: {
  data: EmailPreferencesData;
  dependencies?: Pick<
    EmailPreferencesDependencies,
    | 'getEmailPreferences'
    | 'updateEmailPreferences'
    | 'unsubscribeAllEmailPreferences'
  >;
}) {
  const board = data.seo.boardName;
  const [prefs, setPrefs] = useState(data.prefs);
  const [pending, setPending] = useState(false);
  // What the last change says: why it failed, or a link on its way.
  const [failed, setFailed] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  // Set whenever there are preferences to show: they were read for them.
  const person = data.person ?? '';

  if (prefs === 'invalid_link' || prefs === 'link_expired') {
    const expired = prefs === 'link_expired';
    return (
      <Page width="narrow">
        <PageContent>
          <Empty>
            <EmptyHeader>
              <EmptyTitle>
                <h1>
                  {expired
                    ? m.emailPreferences_expiredTitle()
                    : m.emailPreferences_invalidTitle()}
                </h1>
              </EmptyTitle>
              <EmptyDescription>
                {expired
                  ? m.emailPreferences_expiredBody({ board })
                  : m.emailPreferences_invalidBody({ board })}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </PageContent>
      </Page>
    );
  }

  const run = async (
    action: () => Promise<EmailPreferences>,
    after?: {
      notice?: (prefs: EmailPreferences) => string | null;
      errors?: Partial<Record<string, string>>;
    },
  ) => {
    setPending(true);
    setFailed(null);
    setNotice(null);
    try {
      const next = await action();
      setPrefs(next);
      setNotice(after?.notice?.(next) ?? null);
    } catch (error) {
      setFailed(
        (isBoardApiError(error) ? after?.errors?.[error.code] : undefined) ??
          m.emailPreferences_actionError(),
      );
      // Show what is true now: a link that stopped working, or a token no
      // longer kept, turns into its notice, and an alert or topic removed
      // elsewhere goes.
      try {
        setPrefs(await dependencies.getEmailPreferences({ data: { person } }));
      } catch {
        // Keep what the page shows; the error says the change didn't save.
      }
    } finally {
      setPending(false);
    }
  };
  const update = (
    changes: EmailPreferencesUpdate,
    after?: Parameters<typeof run>[1],
  ) =>
    run(
      () => dependencies.updateEmailPreferences({ data: { person, changes } }),
      after,
    );
  // Back on, alerts that wait for a confirmation link get a fresh one; when
  // it can't go out, nothing changes and the API says why.
  const setJobAlerts = (on: boolean) =>
    update(
      { jobAlerts: on },
      {
        notice: (next) =>
          on && next.jobAlerts.alerts.some((a) => a.awaitingConfirmation)
            ? m.emailPreferences_jobAlertsLinkSent()
            : null,
        errors: {
          rate_limited: m.emailPreferences_jobAlertsThrottled(),
          job_alert_email_suppressed: m.emailPreferences_jobAlertsSuppressed(),
        },
      },
    );
  // Turning something on is the person's opt-in, recorded with the wording
  // they saw; turning it off sends only the change.
  const optIn = (consentText: string) => ({ consentText, source: SOURCE });

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
              <AlertDescription>{failed}</AlertDescription>
            </Alert>
          ) : null}
          {notice ? (
            <Alert role="status">
              <AlertDescription>{notice}</AlertDescription>
            </Alert>
          ) : null}

          <section className="space-y-3" aria-labelledby="ep-job-alerts">
            <h2 id="ep-job-alerts" className="text-lg font-semibold">
              {m.emailPreferences_jobAlertsTitle()}
            </h2>
            {jobAlerts.alerts.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {m.emailPreferences_jobAlertsNone()}
              </p>
            ) : (
              <>
                <PreferenceSwitch
                  id="ep-job-alerts-all"
                  title={m.emailPreferences_jobAlertsAll()}
                  // Neither off nor waiting for room reads as sending.
                  description={
                    jobAlerts.unsubscribed
                      ? m.emailPreferences_jobAlertsOff()
                      : jobAlerts.waitlisted
                        ? m.emailPreferences_jobAlertsWaitlisted({ board })
                        : m.emailPreferences_jobAlertsDescription()
                  }
                  checked={!jobAlerts.unsubscribed}
                  disabled={pending}
                  onCheckedChange={setJobAlerts}
                />
                <ul className="space-y-3">
                  {jobAlerts.alerts.map((alert) => (
                    <li key={alert.id}>
                      <AlertRow
                        alert={alert}
                        jobAlertsOff={jobAlerts.unsubscribed}
                        pending={pending}
                        onPausedChange={(paused) =>
                          update({ alerts: [{ id: alert.id, paused }] })
                        }
                        onDelete={() =>
                          update({ alerts: [{ id: alert.id, delete: true }] })
                        }
                      />
                    </li>
                  ))}
                </ul>
              </>
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
                  ? { marketing: true, ...optIn(marketingConsent) }
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
                {topics.map((topic) => {
                  const change = (subscribed: boolean) => ({
                    topics: [{ key: topic.key, subscribed }],
                  });
                  return (
                    <li key={topic.key}>
                      <PreferenceSwitch
                        id={`ep-topic-${topic.key}`}
                        title={topic.name}
                        // A topic narrows marketing: off with it.
                        checked={marketingOn && topic.subscribed}
                        disabled={pending || !marketingOn}
                        onCheckedChange={(checked) =>
                          update(
                            checked
                              ? {
                                  ...change(true),
                                  ...optIn(
                                    m.emailPreferences_topicConsent({
                                      topic: topic.name,
                                      board,
                                    }),
                                  ),
                                }
                              : change(false),
                          )
                        }
                      />
                    </li>
                  );
                })}
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
                          data: { person },
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

/**
 * One alert: its switch (on while it isn't paused; off and disabled while
 * job alerts are off) and Delete. One waiting for its confirmation link has
 * no switch, because the page can't start it.
 */
function AlertRow({
  alert,
  jobAlertsOff,
  pending,
  onPausedChange,
  onDelete,
}: {
  alert: PreferenceAlert;
  jobAlertsOff: boolean;
  pending: boolean;
  onPausedChange: (paused: boolean) => void;
  onDelete: () => void;
}) {
  const label = alertLabel(alert);
  return (
    <Item variant="outline">
      <ItemContent>
        <ItemTitle>{label}</ItemTitle>
        <ItemDescription>
          {alert.awaitingConfirmation
            ? m.emailPreferences_alertAwaiting()
            : alert.paused
              ? m.emailPreferences_alertPaused()
              : m.emailPreferences_alertWeekly()}
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        {alert.awaitingConfirmation ? null : (
          <Switch
            aria-label={label}
            checked={!jobAlertsOff && !alert.paused}
            disabled={pending || jobAlertsOff}
            onCheckedChange={(on) => onPausedChange(!on)}
          />
        )}
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          aria-label={m.emailPreferences_deleteAlertLabel({ label })}
          onClick={onDelete}
        >
          {m.emailPreferences_deleteAlert()}
        </Button>
      </ItemActions>
    </Item>
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
    <Field orientation="horizontal">
      <FieldContent>
        <FieldLabel id={`${id}-label`} htmlFor={id}>
          {title}
        </FieldLabel>
        {description ? (
          <FieldDescription id={`${id}-description`}>
            {description}
          </FieldDescription>
        ) : null}
      </FieldContent>
      <Switch
        id={id}
        checked={checked}
        disabled={disabled}
        // Named explicitly: in the browser check, the `role="switch"`
        // element took no name from the label's `for`, which reaches the
        // switch's hidden input.
        aria-labelledby={`${id}-label`}
        aria-describedby={description ? `${id}-description` : undefined}
        onCheckedChange={onCheckedChange}
      />
    </Field>
  );
}
