'use client';

/**
 * Job-alert subscribe form: one email field, weekly frequency, double
 * opt-in ("check your email" on success). The search/job context rides
 * in as `filters`/`context` — not visible inputs — matching the hosted
 * board's capture form.
 *
 * Now MARKUP + interaction over `AlertSignupVM` (ADR-0070 Phase 2): all
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
 * forward the input and return the result's `status`. The API is
 * idempotent per (email, filters): a repeat subscribe returns
 * `duplicate`, which this form surfaces honestly.
 */
import { useId, useState } from 'react';

import { BellIcon } from 'lucide-react';

import { toAlertSignupVM } from '@/board/alert-signup-view-model';
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
import type { JobAlertSubscribeInput } from '@cavuno/board';
import type { BoardLabelOverrides } from '@cavuno/board/format';

type Status = 'idle' | 'pending' | 'created' | 'duplicate' | 'error';

export function AlertSignupForm({
  filters,
  context,
  onSubscribe,
  language,
  labels,
  title,
  description,
}: {
  filters?: JobAlertSubscribeInput['filters'];
  context?: JobAlertSubscribeInput['context'];
  /** Perform the subscribe (see wiring docs); resolve with the API status. */
  onSubscribe: (
    input: JobAlertSubscribeInput,
  ) => Promise<{ status: 'created' | 'duplicate' }>;
  /** Board language (ISO code) from `board.context()`. */
  language: string;
  /** Operator label overrides (`board.context().labels`), ADR-0059. */
  labels?: BoardLabelOverrides;
  title?: string;
  description?: string;
}) {
  const emailInputId = useId();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  const vm = toAlertSignupVM(language, labels);

  const message =
    status === 'created'
      ? vm.messages.created
      : status === 'duplicate'
        ? vm.messages.duplicate
        : status === 'error'
          ? vm.messages.error
          : null;

  return (
    <section aria-label={vm.sectionAriaLabel}>
      <Card className="border-primary bg-primary/5 gap-3 border py-5 shadow-none ring-0">
        <CardHeader className="pr-12">
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
                setStatus(
                  result.status === 'created' ? 'created' : 'duplicate',
                );
                if (result.status === 'created') setEmail('');
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
                <InputGroup className="bg-background flex-1">
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
                      // Clear a stale created/duplicate/error message once the
                      // user edits the address.
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
