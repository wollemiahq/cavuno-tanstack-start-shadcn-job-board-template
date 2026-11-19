'use client';

/**
 * Job-alert subscribe form: one email field, weekly frequency, double
 * opt-in ("check your email" on success). The search/job context rides
 * in as `filters`/`context` — not visible inputs — matching the hosted
 * board's capture form.
 *
 * Markup and interaction over `AlertSignupVM`: all
 * copy resolves through `toAlertSignupVM` (src/board/alert-signup-view-model.ts),
 * so the form makes no runtime SDK/copy call and can be restyled freely. The
 * only `@cavuno/board*` import left is TYPE-ONLY — `JobAlertSubscribeInput`
 * is the form's wire contract with the route (erased at runtime), kept direct so the generated DESIGN.md stays precise for the
 * builder. Pass `title`/`description` to override per placement (e.g. the
 * hosted board's search-page vs job-page variants).
 *
 * Wiring: `onSubscribe` calls the Board API — client-side that is
 * `board.jobAlerts.subscribe(input)`; behind a server function/action,
 * forward the input and return the result's `submitted` status. The API uses
 * one uniform result so the UI never reveals whether an address already has
 * a matching subscription. When the API refuses the address because its
 * domain has no mail server (`email_domain_undeliverable`), resolve with
 * that status and the error's `details.suggestion`: the form says so and
 * offers the correction in one line. The same correction shows as a muted
 * "Did you mean" hint on blur. Both come from the shared
 * `EmailSuggestionHint`.
 */
import { useId, useState } from 'react';

import { BellIcon } from 'lucide-react';

import { toAlertSignupVM } from '@/board/alert-signup-view-model';
import { useBoardConversionAnalytics } from '@/components/board-conversion-analytics';
import {
  EmailSuggestionHint,
  useEmailSuggestion,
} from '@/components/email-suggestion-hint';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field';
import { InputGroup, InputGroupInput } from '@/components/ui/input-group';
import { Spinner } from '@/components/ui/spinner';
import type { JobAlertSubscribeDataLayerEvent } from '@/lib/board-datalayer-events';
import { pushBoardConversionEvent } from '@/lib/board-pixel-conversions';
import { cn } from '@/lib/utils';
import type { JobAlertSubscribeInput } from '@cavuno/board';
type Status = 'idle' | 'pending' | 'submitted' | 'error' | 'undeliverable';

export function AlertSignupForm({
  filters,
  context,
  onSubscribe,
  language,
  title,
  description,
  surface = 'default',
}: {
  filters?: JobAlertSubscribeInput['filters'];
  context?: JobAlertSubscribeInput['context'];
  /** Perform the subscribe (see wiring docs); resolve with the API status. */
  onSubscribe: (
    input: JobAlertSubscribeInput,
  ) => Promise<
    | { status: 'submitted' }
    | { status: 'email_domain_undeliverable'; suggestion?: string | null }
  >;
  /** Board language (ISO code) from `board.context()`. */
  language: string;
  title?: string;
  description?: string;
  /**
   * Card surface. Both variants render the standard `Card` (opaque `bg-card`,
   * default border/ring/spacing) so the box reads like every other card on the
   * page. `card` adds a stronger lift shadow and header clearance for the
   * floating prompt, which sits over page content and carries an absolute
   * close button; `default` is the plain in-flow card.
   */
  surface?: 'default' | 'card';
}) {
  const emailInputId = useId();
  const conversion = useBoardConversionAnalytics();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const emailSuggestion = useEmailSuggestion();
  const invalid = status === 'error' || status === 'undeliverable';

  const vm = toAlertSignupVM(language);

  const message =
    status === 'submitted'
      ? vm.messages.submitted
      : status === 'error'
        ? vm.messages.error
        : null;

  return (
    <section aria-label={vm.sectionAriaLabel}>
      <Card className={cn(surface === 'card' && 'shadow-lg')}>
        <CardHeader className={cn(surface === 'card' && 'pe-12')}>
          <CardTitle>
            <h2 className="text-foreground flex items-center gap-2 text-base font-semibold">
              <BellIcon className="text-primary size-4" aria-hidden="true" />
              {title ?? vm.defaultTitle}
            </h2>
          </CardTitle>
          {description ? (
            <CardDescription>{description}</CardDescription>
          ) : null}
        </CardHeader>
        <CardContent>
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              setStatus('pending');
              try {
                const result = await onSubscribe({
                  email,
                  consent: true,
                  frequency: 'weekly',
                  filters,
                  context,
                });
                if (result.status === 'email_domain_undeliverable') {
                  emailSuggestion.offer(result.suggestion);
                  setStatus('undeliverable');
                  return;
                }
                if (conversion) {
                  const conversionEvent: JobAlertSubscribeDataLayerEvent = {
                    event: 'job_alert_subscribe',
                    board_slug: conversion.boardSlug,
                    source: context?.source ?? 'form',
                  };
                  if (context?.jobId) conversionEvent.job_id = context.jobId;
                  if (context?.jobSlug) {
                    conversionEvent.job_slug = context.jobSlug;
                  }
                  pushBoardConversionEvent(
                    conversion.analytics,
                    conversionEvent,
                  );
                }
                setStatus('submitted');
                setEmail('');
                emailSuggestion.clear();
              } catch {
                setStatus('error');
              }
            }}
          >
            <Field data-invalid={invalid}>
              <FieldLabel className="sr-only" htmlFor={emailInputId}>
                {vm.emailAriaLabel}
              </FieldLabel>
              <ButtonGroup className="w-full">
                {/* Standard card surface — the input keeps its default
                    treatment (a bg override here once made the field
                    invisible on the opaque card). */}
                <InputGroup className="flex-1">
                  <InputGroupInput
                    id={emailInputId}
                    type="email"
                    name="email"
                    aria-label={vm.emailAriaLabel}
                    aria-invalid={invalid}
                    inputMode="email"
                    autoComplete="email"
                    placeholder={vm.emailPlaceholder}
                    required
                    value={email}
                    disabled={status === 'pending'}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      emailSuggestion.clear();
                      // Clear a stale submitted/error message once the user
                      // edits the address.
                      if (status !== 'idle' && status !== 'pending')
                        setStatus('idle');
                    }}
                    onBlur={(event) =>
                      emailSuggestion.check(event.target.value)
                    }
                  />
                </InputGroup>
                <Button
                  type="submit"
                  aria-label={vm.submitAriaLabel}
                  disabled={status === 'pending'}
                >
                  {status === 'pending' ? (
                    <Spinner data-icon="inline-start" />
                  ) : null}
                  {status === 'pending' ? vm.subscribingLabel : vm.buttonText}
                </Button>
              </ButtonGroup>
              {/* The one message for this field when the domain is refused:
                  the refusal and its correction in one line. */}
              <EmailSuggestionHint
                suggestion={emailSuggestion.suggestion}
                refused={status === 'undeliverable'}
                disabled={status === 'pending'}
                onAccept={(suggested) => {
                  setEmail(suggested);
                  emailSuggestion.clear();
                  setStatus('idle');
                }}
              />
              {message ? (
                invalid ? (
                  <FieldError>{message}</FieldError>
                ) : (
                  <FieldDescription role="status">{message}</FieldDescription>
                )
              ) : null}
            </Field>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
