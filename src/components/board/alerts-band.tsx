'use client';

/**
 * The dark job-alerts band (CAV-497) — the Lumen-style full-width dark
 * panel above the footer on listing surfaces that have no other alert
 * capture: a heading on the left, the email + subscribe row on the right.
 *
 * The dark look is the Untitled UI dark-section trick: the section wears
 * the `dark` scheme class (this starter's adapted dark selector) so every
 * token inside resolves to its dark value — no bespoke colors, and the board's brand ramp carries through.
 *
 * Same contract as `AlertSignupForm` (copy via `toAlertSignupVM`, the
 * idempotent subscribe statuses surfaced honestly); a lean horizontal
 * sibling, not a replacement — job listings keep their context-carrying
 * floating prompt instead.
 */
import { useState } from 'react';

import { Button } from '@/components/base/buttons/button';
import { InputBase } from '@/components/base/input/input';
import { Text } from '@/components/text';
import { toAlertSignupVM } from '@/board/alert-signup-view-model';
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
    <div className="mx-auto w-full max-w-container px-4 pb-10 md:px-8">
      <section
        aria-label={vm.sectionAriaLabel}
        className="dark flex flex-col gap-5 rounded-2xl bg-primary px-6 py-8 md:flex-row md:items-center md:justify-between md:px-10 md:py-10"
      >
        <div className="flex max-w-md flex-col gap-1.5">
          <Text as="h2" variant="heading3">{vm.defaultTitle}</Text>
          {message ? (
            <p
              role="status"
              className={status === 'error' ? 'text-sm text-error-primary' : 'text-sm text-tertiary'}
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
          <InputBase
            type="email"
            name="email"
            aria-label={vm.emailAriaLabel}
            inputMode="email"
            autoComplete="email"
            placeholder={vm.emailPlaceholder}
            isRequired
            value={email}
            isDisabled={status === 'pending'}
            onChange={(event) => {
              setEmail(event.target.value);
              if (status !== 'idle' && status !== 'pending') setStatus('idle');
            }}
            wrapperClassName="flex-1"
          />
          <Button
            type="submit"
            color="primary"
            size="md"
            aria-label={vm.submitAriaLabel}
            isDisabled={status === 'pending'}
          >
            {status === 'pending' ? vm.subscribingLabel : vm.buttonText}
          </Button>
        </form>
      </section>
    </div>
  );
}
