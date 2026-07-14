'use client';

/**
 * The dark job-alerts band (CAV-497) — the Lumen-style full-width dark
 * panel above the footer on listing surfaces that have no other alert
 * capture: a heading on the left, the email + subscribe row on the right.
 *
 * The section wears the `dark` scheme class so its owned semantic tokens
 * resolve against the dark palette while the board's brand ramp carries through.
 *
 * Same contract as `AlertSignupForm` (copy via `toAlertSignupVM`, the
 * idempotent subscribe statuses surfaced honestly); a lean horizontal
 * sibling, not a replacement — job listings keep their context-carrying
 * floating prompt instead.
 */
import { useState } from 'react';

import { toAlertSignupVM } from '@/board/alert-signup-view-model';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { JobAlertSubscribeInput } from '@cavuno/board';
import type { BoardLabelOverrides } from '@cavuno/board/format';

type Status = 'idle' | 'pending' | 'created' | 'duplicate' | 'error';

export function AlertsBand({
  onSubscribe,
  language,
  labels,
  source,
}: {
  /** Perform the subscribe (see AlertSignupForm wiring docs). */
  onSubscribe: (
    input: JobAlertSubscribeInput,
  ) => Promise<{ status: 'created' | 'duplicate' }>;
  /** Board language (ISO code) from `board.context()`. */
  language: string;
  /** Operator label overrides (`board.context().labels`), ADR-0059. */
  labels?: BoardLabelOverrides;
  /** Attribution context for the subscription (e.g. "companies_list"). */
  source: string;
}) {
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
    <div className="mx-auto w-full max-w-7xl px-4 pb-10 md:px-8">
      <section
        aria-label={vm.sectionAriaLabel}
        className="dark bg-background text-foreground flex flex-col gap-5 rounded-2xl px-6 py-8 md:flex-row md:items-center md:justify-between md:px-10 md:py-10"
      >
        <div className="flex max-w-md flex-col gap-1.5">
          <h2 className="font-heading text-xl font-semibold tracking-tight">
            {vm.defaultTitle}
          </h2>
          {message ? (
            <p
              role="status"
              className={
                status === 'error'
                  ? 'text-destructive text-sm'
                  : 'text-muted-foreground text-sm'
              }
            >
              {message}
            </p>
          ) : null}
        </div>
        <form
          className="flex w-full max-w-md gap-2"
          onSubmit={async (event) => {
            event.preventDefault();
            setStatus('pending');
            try {
              const result = await onSubscribe({
                email,
                consent: true,
                frequency: 'weekly',
                context: { source },
              });
              setStatus(result.status === 'created' ? 'created' : 'duplicate');
              if (result.status === 'created') setEmail('');
            } catch {
              setStatus('error');
            }
          }}
        >
          <Input
            type="email"
            name="email"
            aria-label={vm.emailAriaLabel}
            inputMode="email"
            autoComplete="email"
            placeholder={vm.emailPlaceholder}
            required
            value={email}
            disabled={status === 'pending'}
            onChange={(event) => {
              setEmail(event.target.value);
              if (status !== 'idle' && status !== 'pending') setStatus('idle');
            }}
            className="flex-1"
          />
          <Button
            type="submit"
            aria-label={vm.submitAriaLabel}
            disabled={status === 'pending'}
          >
            {status === 'pending' ? vm.subscribingLabel : vm.buttonText}
          </Button>
        </form>
      </section>
    </div>
  );
}
