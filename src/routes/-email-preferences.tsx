import { Fragment, useState } from 'react';

import { isBoardApiError } from '@cavuno/board';
import { Link } from '@tanstack/react-router';
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
  const run = async <Result extends EmailPreferences>(
    action: () => Promise<Result>,
    errors?: ErrorMessages,
  ): Promise<Result | null> => {
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
  // Job alerts back on: alerts that wait for a confirmation link get a fresh
  // one, and the API says when it queued one; when it can't go out, nothing
  // changes and the API says why.
  const changeJobEmails = async (changes: EmailPreferencesUpdate) => {
    const next = await update(
      changes,
      changes.jobAlerts
        ? {
            rate_limited: m.emailPreferences_jobAlertsThrottled(),
            job_alert_email_suppressed:
              m.emailPreferences_jobAlertsSuppressed(),
          }
        : undefined,
    );
    if (next?.confirmationEmailQueued) {
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
  const { alerts } = jobAlerts;
  const alertsOn = !jobAlerts.unsubscribed;
  // On while job alerts are on and it isn't paused; one waiting for its
  // confirmation link counts, since it starts once the link is clicked.
  const alertOn = (alert: PreferenceAlert) => alertsOn && !alert.paused;
  // Pausable: confirmed, and not waiting for a link (the API refuses both).
  const pausable = (alert: PreferenceAlert) =>
    jobAlerts.confirmed && !alert.awaitingConfirmation;
  const matchesOn = jobMatches?.subscribed === true;
  const jobEmailsOn = alerts.some(alertOn) || matchesOn;
  // Until the board's API says it offers job matches, a person without them
  // gets no setup link.
  const matchesSetup =
    jobMatches === null &&
    'jobMatchesOffered' in prefs &&
    prefs.jobMatchesOffered === true;

  // Off turns every source off, as the weekly email's Unsubscribe does. On
  // turns them all back on, and resumes paused alerts when every alert was
  // paused, so on always sends something.
  const setJobEmails = (on: boolean) => {
    const changes: EmailPreferencesUpdate = {};
    if (!on) {
      if (alertsOn && alerts.length > 0) changes.jobAlerts = false;
      if (matchesOn) changes.jobMatches = false;
      return changeJobEmails(changes);
    }
    if (alerts.length > 0 && !alertsOn) changes.jobAlerts = true;
    if (alerts.every((alert) => alert.paused)) {
      const resume = alerts.filter(pausable);
      if (resume.length) {
        changes.alerts = resume.map((alert) => ({
          id: alert.id,
          paused: false,
        }));
      }
    }
    if (jobMatches && !matchesOn) changes.jobMatches = true;
    return changeJobEmails(changes);
  };
  // One alert's switch pauses or resumes it. Turned on while job alerts are
  // off, job alerts come back on with only this one: the others that showed
  // as off are paused.
  const setAlertOn = (alert: PreferenceAlert, on: boolean) => {
    if (alertsOn) {
      return changeJobEmails({ alerts: [{ id: alert.id, paused: !on }] });
    }
    const changes: EmailPreferencesUpdate = { jobAlerts: true };
    const others = alerts
      .filter((other) => pausable(other) && (other === alert || !other.paused))
      .map((other) => ({ id: other.id, paused: other !== alert }));
    if (others.length) changes.alerts = others;
    return changeJobEmails(changes);
  };
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
            id="ep-job-emails"
            title={m.emailPreferences_jobEmailsTitle()}
          >
            {alerts.length === 0 && jobMatches === null ? (
              <FieldDescription>
                {m.emailPreferences_jobAlertsNone()}
              </FieldDescription>
            ) : (
              <PreferenceSwitch
                id="ep-job-emails-all"
                title={m.emailPreferences_jobEmailsAll()}
                description={
                  jobEmailsOn && alertsOn && jobAlerts.waitlisted
                    ? m.emailPreferences_jobMatchesWaitlisted({ board })
                    : m.emailPreferences_jobEmailsDescription()
                }
                checked={jobEmailsOn}
                disabled={pending}
                onCheckedChange={(on) => void setJobEmails(on)}
              />
            )}
            {alerts.map((alert) => (
              <Fragment key={alert.id}>
                <FieldSeparator />
                <AlertRow
                  alert={alert}
                  filterNames={data.filterNames}
                  checked={alertOn(alert)}
                  // Waiting for its link: off, it turns on to send a fresh
                  // one; on, it can only wait. Unconfirmed: nothing pauses.
                  switchable={
                    alertsOn
                      ? pausable(alert)
                      : alert.awaitingConfirmation || pausable(alert)
                  }
                  jobAlertsOff={!alertsOn}
                  pending={pending}
                  onCheckedChange={(on) => void setAlertOn(alert, on)}
                  onDelete={() =>
                    update({ alerts: [{ id: alert.id, delete: true }] })
                  }
                />
              </Fragment>
            ))}
            {jobMatches !== null ? (
              <>
                <FieldSeparator />
                <PreferenceSwitch
                  id="ep-job-matches"
                  title={m.emailPreferences_jobMatchesRow()}
                  description={
                    jobMatches.waitlisted
                      ? m.emailPreferences_jobMatchesWaitlisted({ board })
                      : undefined
                  }
                  checked={matchesOn}
                  disabled={pending}
                  onCheckedChange={(checked) => update({ jobMatches: checked })}
                />
              </>
            ) : matchesSetup ? (
              <>
                <FieldSeparator />
                <FieldDescription>
                  <Link to="/matches">
                    {m.emailPreferences_jobMatchesSetup()}
                  </Link>
                </FieldDescription>
              </>
            ) : null}
          </PreferenceCard>

          <PreferenceCard
            id="ep-other"
            title={m.emailPreferences_otherEmailsTitle()}
          >
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
 * One alert, titled with the sentence its digest heading uses ("Jobs
 * matching “designer” near Berlin", "Jobs similar to Product Designer"),
 * with what else it matches (or, while it waits for its confirmation link,
 * that). Its switch pauses or resumes it; its ⋯ menu deletes it.
 */
function AlertRow({
  alert,
  filterNames,
  checked,
  switchable,
  jobAlertsOff,
  pending,
  onCheckedChange,
  onDelete,
}: {
  alert: PreferenceAlert;
  filterNames: AlertFilterNames;
  checked: boolean;
  /** False when the API would refuse the change, so the switch is off-limits. */
  switchable: boolean;
  /** Job alerts are off, so an alert waiting for its link turns on for one. */
  jobAlertsOff: boolean;
  pending: boolean;
  onCheckedChange: (on: boolean) => void;
  onDelete: () => void;
}) {
  const { headline, criteria, places } = describeJobAlert(alert, filterNames);
  // A similar-job alert without a name is named by its job, unlinked here;
  // an unnamed alert says where, as its digest does, and names a place once.
  const label =
    headline === null
      ? anchorJobTitleText(alert.anchorJob)
      : places && !alert.label
        ? m.emailPreferences_alertNear({ jobs: headline, place: places })
        : headline;
  const rest = criteria.filter(
    (part) =>
      !(places && !alert.label && part === places) &&
      part !== m.jobAlertMatch_anyCriteria(),
  );
  const detail = !alert.awaitingConfirmation
    ? rest.join(' · ')
    : jobAlertsOff
      ? m.emailPreferences_alertAwaitingJobAlertsOff()
      : m.emailPreferences_alertAwaiting();
  const id = `ep-alert-${alert.id}`;
  return (
    <Field orientation="horizontal">
      <FieldContent>
        <FieldLabel id={`${id}-label`} htmlFor={id}>
          <span className="line-clamp-2" title={label}>
            {label}
          </span>
        </FieldLabel>
        {detail ? (
          <FieldDescription id={`${id}-description`}>{detail}</FieldDescription>
        ) : null}
      </FieldContent>
      <div className="flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              // Stays enabled while a change saves, so the menu can hand
              // focus back to it; the item waits instead.
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
            <DropdownMenuItem
              variant="destructive"
              disabled={pending}
              onClick={onDelete}
            >
              {m.emailPreferences_deleteAlert()}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Switch
          id={id}
          checked={checked}
          disabled={pending || !switchable}
          aria-labelledby={`${id}-label`}
          aria-describedby={detail ? `${id}-description` : undefined}
          onCheckedChange={onCheckedChange}
        />
      </div>
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
