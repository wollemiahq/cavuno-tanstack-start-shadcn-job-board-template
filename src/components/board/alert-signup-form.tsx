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
 * only `@cavuno/board*` imports left are TYPE-ONLY — `JobAlertSubscribeInput`
 * / `BoardLabelOverrides` are the form's wire contract with the route (erased
 * at runtime), kept direct so the generated DESIGN.md stays precise for the
 * builder. Pass `title`/`description` to override per placement (e.g. the
 * hosted board's search-page vs job-page variants).
 *
 * Wiring: `onSubscribe` calls the Board API — client-side that is
 * `board.jobAlerts.subscribe(input)`; behind a server function/action,
 * forward the input and return the result's `submitted` status. The API uses
 * one uniform result so the UI never reveals whether an address already has
 * a matching subscription.
 */
import { useId, useState } from 'react';

import { BellIcon } from 'lucide-react';

import { toAlertSignupVM } from '@/board/alert-signup-view-model';
import {
  MarketingConsentField,
  type MarketingConsentDeclaration,
} from '@/components/board/marketing-consent-field';
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
import { cn } from '@/lib/utils';
import type { JobAlertSubscribeInput } from '@cavuno/board';
import type { BoardLabelOverrides } from '@cavuno/board/format';

type Status = 'idle' | 'pending' | 'submitted' | 'error';

export function AlertSignupForm({
  filters,
  context,
  onSubscribe,
  language,
  labels,
  title,
  description,
  surface = 'default',
  marketingConsent,
}: {
  filters?: JobAlertSubscribeInput['filters'];
  context?: JobAlertSubscribeInput['context'];
  /** Perform the subscribe (see wiring docs); resolve with the API status. */
  onSubscribe: (
    input: JobAlertSubscribeInput,
  ) => Promise<{ status: 'submitted' }>;
  /** Board language (ISO code) from `board.context()`. */
  language: string;
  /** Operator label overrides from `board.context().labels`. */
  labels?: BoardLabelOverrides;
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
  /**
   * Optional newsletter opt-in shown beneath the email field (MKT-05). Omit it,
   * or pass a `null` declaration, and the form is unchanged.
   *
   * `declaration` comes from `flow.loadDeclaration()`; `onOptIn` should call
   * `flow.submit({ email })`. Subscribing to job alerts and granting marketing
   * permission are separate decisions with separate evidence, so they are two
   * calls here rather than one flag on the subscribe payload.
   */
  marketingConsent?: {
    declaration: MarketingConsentDeclaration | null;
    onOptIn: (email: string) => Promise<unknown>;
  };
}) {
  const emailInputId = useId();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [consentChecked, setConsentChecked] = useState(false);

  const vm = toAlertSignupVM(language, labels);

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
                await onSubscribe({
                  email,
                  consent: true,
                  frequency: 'weekly',
                  filters,
                  context,
                });

                // Runs only after the alert subscription commits, and caught
                // separately: the subscribe genuinely succeeded, so a failed
                // newsletter opt-in must not flip this form to its error
                // state. `onOptIn` owns reporting its own outcome.
                if (marketingConsent?.declaration && consentChecked) {
                  try {
                    await marketingConsent.onOptIn(email);
                  } catch {
                    // Intentionally ignored here — see above.
                  }
                }

                setStatus('submitted');
                setEmail('');
                setConsentChecked(false);
              } catch {
                setStatus('error');
              }
            }}
          >
            <Field data-invalid={status === 'error'}>
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
                    aria-invalid={status === 'error'}
                    inputMode="email"
                    autoComplete="email"
                    placeholder={vm.emailPlaceholder}
                    required
                    value={email}
                    disabled={status === 'pending'}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      // Clear a stale submitted/error message once the user
                      // edits the address.
                      if (status !== 'idle' && status !== 'pending')
                        setStatus('idle');
                    }}
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
              {marketingConsent ? (
                <MarketingConsentField
                  declaration={marketingConsent.declaration}
                  checked={consentChecked}
                  onCheckedChange={setConsentChecked}
                  disabled={status === 'pending'}
                  className="mt-3"
                />
              ) : null}
              {message ? (
                status === 'error' ? (
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
