'use client';

/**
 * Marketing-permission consent checkbox — the rendered half of the Board's
 * newsletter opt-in (MKT-05). Pairs with `createMarketingConsentFlow` from
 * `@cavuno/board`, which supplies the declaration and performs the submit.
 *
 * The two rules this component exists to enforce:
 *
 *   1. The label text is the Board's DECLARED disclosure, passed in as
 *      `declaration`. It is never authored here and never falls back to
 *      placeholder copy — the grant evidence records which disclosure version
 *      the person agreed to, so showing different words breaks that record.
 *   2. It renders nothing when `declaration` is `null`. That is what
 *      `flow.loadDeclaration()` returns when the Board has no active capture,
 *      which is the default for every Board. Guarding here means a page can
 *      drop the field in unconditionally and stay correct.
 *
 * Wiring: hold the checked state in the surrounding form, and on submit call
 * `flow.submit({ email })` only when it is ticked. `submit` starts double
 * opt-in — the person is not subscribed until they click the emailed link, so
 * present it as "check your email", never as "subscribed".
 */
import { useId } from 'react';

import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { cn } from '@/lib/utils';

/**
 * Structurally identical to `MarketingConsentDeclaration` in `@cavuno/board`.
 * Declared locally because this template is pinned to an SDK release that
 * predates that export; swap to
 * `import type { MarketingConsentDeclaration } from '@cavuno/board'` once the
 * dependency is bumped past the release carrying it.
 */
export interface MarketingConsentDeclaration {
  disclosureText: string;
  privacyPolicyUrl: string;
  disclosureVersion: number;
}

export function MarketingConsentField({
  declaration,
  checked,
  onCheckedChange,
  disabled = false,
  privacyLinkLabel = 'Privacy Policy',
  className,
}: {
  /** From `flow.loadDeclaration()`. `null` means capture is off — render nothing. */
  declaration: MarketingConsentDeclaration | null;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  privacyLinkLabel?: string;
  className?: string;
}) {
  const checkboxId = useId();

  if (!declaration) {
    return null;
  }

  return (
    <Field
      orientation="horizontal"
      className={cn('items-start gap-2', className)}
    >
      <Checkbox
        id={checkboxId}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        // Unchecked unless the caller says otherwise. A pre-ticked box is not
        // consent, and the API will reject evidence gathered that way.
        className="mt-0.5"
      />
      <div className="grid gap-1">
        <FieldLabel
          htmlFor={checkboxId}
          className="text-muted-foreground text-sm leading-relaxed font-normal"
        >
          {declaration.disclosureText}
        </FieldLabel>
        <FieldDescription>
          <a
            className="underline underline-offset-2"
            href={declaration.privacyPolicyUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            {privacyLinkLabel}
          </a>
        </FieldDescription>
      </div>
    </Field>
  );
}
