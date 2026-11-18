import { Fragment, useState } from 'react';

import { isBoardApiError } from '@cavuno/board';
import { MoreHorizontal } from 'lucide-react';

import {
  emailPreferencesDependencies,
  type EmailPreferencesData,
  type EmailPreferencesDependencies,
} from './-email-preferences-loader';

import { describeJobAlert } from '@/board/job-alert-description';
import type { AlertFilterNames } from '@/board/job-alert-match';
import { anchorJobTitleText } from '@/components/anchor-job-title';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  FieldGroup,
  FieldLabel,
  FieldSeparator,
  FieldTitle,
} from '@/components/ui/field';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { m } from '@/paraglide/messages';
import type {
  BOARD_API_ERROR_CODES,
  EmailPreferences,
  EmailPreferencesUpdate,
} from '@cavuno/board';

/** Recorded as the consent's `source`. */
const SOURCE = 'email-preferences';

type PreferenceAlert = EmailPreferences['jobAlerts']['alerts'][number];

/** Messages for the Board API codes a change can fail with. */
type ErrorMessages = {
  [code in (typeof BOARD_API_ERROR_CODES)[number]]?: string;
};

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
  const [message, setMessage] = useState<{
    tone: 'error' | 'status';
    text: string;
  } | null>(null);
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

  /** Applies a change and returns what the API says now; null if it failed. */
  const run = async (
    action: () => Promise<EmailPreferences>,
    errors?: ErrorMessages,
  ): Promise<EmailPreferences | null> => {
    setPending(true);
    setMessage(null);
    try {
      const next = await action();
      setPrefs(next);
      return next;
    } catch (error) {
      setMessage({
        tone: 'error',
        text:
          (isBoardApiError(error) && errors && Object.hasOwn(errors, error.code)
            ? // SAFETY: Object.hasOwn checked the code is one of its keys.
              errors[error.code as keyof ErrorMessages]
            : undefined) ?? m.emailPreferences_actionError(),
      });
      // Show what is true now: a link that stopped working, or a token no
      // longer kept, turns into its notice, and an alert or topic removed
      // elsewhere goes.
      try {
        setPrefs(await dependencies.getEmailPreferences({ data: { person } }));
      } catch {
        // Keep what the page shows; the error says the change didn't save.
      }
      return null;
    } finally {
      setPending(false);
    }
  };
  const update = (changes: EmailPreferencesUpdate, errors?: ErrorMessages) =>
    run(
      () => dependencies.updateEmailPreferences({ data: { person, changes } }),
      errors,
    );
  // Back on, alerts that wait for a confirmation link get a fresh one; when
  // it can't go out, nothing changes and the API says why.
  const setJobAlerts = async (on: boolean) => {
    const next = await update(
      { jobAlerts: on },
      on
        ? {
            rate_limited: m.emailPreferences_jobAlertsThrottled(),
            job_alert_email_suppressed:
              m.emailPreferences_jobAlertsSuppressed(),
          }
        : undefined,
    );
    if (on && next?.jobAlerts.alerts.some((a) => a.awaitingConfirmation)) {
      setMessage({
        tone: 'status',
        text: m.emailPreferences_jobAlertsLinkSent(),
      });
    }
  };
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
        <div className="space-y-6 py-4">
          <header className="space-y-1">
            <h1 className="font-heading text-3xl font-semibold tracking-tight">
              {m.emailPreferences_title()}
            </h1>
            <p className="text-muted-foreground text-sm">
              {m.emailPreferences_description({ board })}
            </p>
            <p className="text-muted-foreground text-sm">{prefs.email}</p>
          </header>

          {message?.tone === 'error' ? (
            <Alert variant="destructive">
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          ) : message ? (
            <Alert role="status">
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          ) : null}

          <PreferenceCard
            id="ep-job-alerts"
            title={m.emailPreferences_jobAlertsTitle()}
          >
            {jobAlerts.alerts.length === 0 ? (
              <FieldDescription>
                {m.emailPreferences_jobAlertsNone()}
              </FieldDescription>
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
                        ? m.emailPreferences_jobMatchesWaitlisted({ board })
                        : m.emailPreferences_jobAlertsDescription()
                  }
                  checked={!jobAlerts.unsubscribed}
                  disabled={pending}
                  onCheckedChange={setJobAlerts}
                />
                <FieldSeparator />
                <ul className="flex flex-col gap-6">
                  {jobAlerts.alerts.map((alert, index) => (
                    <li key={alert.id} className="flex flex-col gap-6">
                      {index > 0 ? <FieldSeparator /> : null}
                      <AlertRow
                        alert={alert}
                        filterNames={data.filterNames}
                        canPause={jobAlerts.confirmed}
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
          </PreferenceCard>

          <PreferenceCard
            id="ep-other"
            title={m.emailPreferences_otherEmailsTitle()}
          >
            {jobMatches !== null ? (
              <>
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
                <FieldSeparator />
              </>
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
          </PreferenceCard>

          {topics.length > 0 ? (
            <PreferenceCard
              id="ep-topics"
              title={m.emailPreferences_topicsTitle()}
              description={
                marketingOn ? undefined : m.emailPreferences_topicsOffHint()
              }
            >
              {topics.map((topic, index) => {
                const change = (subscribed: boolean) => ({
                  topics: [{ key: topic.key, subscribed }],
                });
                return (
                  <Fragment key={topic.key}>
                    {index > 0 ? <FieldSeparator /> : null}
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
                  </Fragment>
                );
              })}
            </PreferenceCard>
          ) : null}

          {/* The way out of everything, after the cards: what it stops, then
              the button; once everything is off, the same place says so. */}
          <Separator />
          <footer className="space-y-3">
            {everythingOff ? (
              <Alert role="status">
                <AlertDescription>
                  {m.emailPreferences_unsubscribedAll({ board })}
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <p className="text-muted-foreground text-sm">
                  {m.emailPreferences_unsubscribeAllHint({ board })}
                </p>
                <AlertDialog open={confirming} onOpenChange={setConfirming}>
                  <AlertDialogTrigger
                    render={
                      <Button variant="outline" size="sm" disabled={pending} />
                    }
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
              </>
            )}
          </footer>
        </div>
      </PageContent>
    </Page>
  );
}

/** One section: its title, then a card whose rows are split by dividers. */
function PreferenceCard({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3" aria-labelledby={id}>
      <h2 id={id} className="text-lg font-semibold">
        {title}
      </h2>
      {description ? (
        <p className="text-muted-foreground text-sm">{description}</p>
      ) : null}
      <Card>
        <CardContent>
          <FieldGroup>{children}</FieldGroup>
        </CardContent>
      </Card>
    </section>
  );
}

/**
 * One alert, named as `/alerts/manage` names it, with what else it matches
 * (or, while it waits for its confirmation link, that) and a Paused badge.
 * It has no switch: the job alerts switch is the only one. Its ⋯ menu
 * pauses or resumes it and deletes it; one waiting for its link can only be
 * deleted, because the page can't start it.
 */
function AlertRow({
  alert,
  filterNames,
  canPause,
  pending,
  onPausedChange,
  onDelete,
}: {
  alert: PreferenceAlert;
  filterNames: AlertFilterNames;
  /** False when the hub would ignore a pause: an unconfirmed person. */
  canPause: boolean;
  pending: boolean;
  onPausedChange: (paused: boolean) => void;
  onDelete: () => void;
}) {
  const { headline, criteria } = describeJobAlert(alert, filterNames);
  // A similar-job alert without a name is named by its job, unlinked here.
  const label = headline ?? anchorJobTitleText(alert.anchorJob);
  const detail = alert.awaitingConfirmation
    ? m.emailPreferences_alertAwaiting()
    : criteria.join(' · ');
  return (
    <Field orientation="horizontal">
      <FieldContent>
        <FieldTitle>
          {label}
          {alert.paused && !alert.awaitingConfirmation ? (
            <Badge variant="secondary">{m.alertsManage_pausedBadge()}</Badge>
          ) : null}
        </FieldTitle>
        {detail ? <FieldDescription>{detail}</FieldDescription> : null}
      </FieldContent>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            // Stays enabled while a change saves, so the menu can hand focus
            // back to it; the items wait instead.
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={m.emailPreferences_alertActionsLabel({ label })}
            />
          }
        >
          <MoreHorizontal aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {alert.awaitingConfirmation || !canPause ? null : (
            <DropdownMenuItem
              disabled={pending}
              onClick={() => onPausedChange(!alert.paused)}
            >
              {alert.paused
                ? m.emailPreferences_resumeAlert()
                : m.emailPreferences_pauseAlert()}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            variant="destructive"
            disabled={pending}
            onClick={onDelete}
          >
            {m.emailPreferences_deleteAlert()}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </Field>
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
