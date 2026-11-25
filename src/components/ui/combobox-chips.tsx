'use client';

import * as React from 'react';

import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox';
import { XIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// The chip parts of the combobox, in their own module so only the screens
// that use chips load them, not every combobox route.
function ComboboxChips({
  className,
  ...props
}: React.ComponentPropsWithRef<typeof ComboboxPrimitive.Chips> &
  ComboboxPrimitive.Chips.Props) {
  return (
    <ComboboxPrimitive.Chips
      data-slot="combobox-chips"
      className={cn(
        'bg-input/50 focus-within:border-ring focus-within:ring-ring/30 has-aria-invalid:border-destructive has-aria-invalid:ring-destructive/20 dark:has-aria-invalid:border-destructive/50 dark:has-aria-invalid:ring-destructive/40 flex min-h-8 flex-wrap items-center gap-1 rounded-2xl border border-transparent bg-clip-padding px-2.5 py-1 text-sm transition-[color,box-shadow] duration-200 focus-within:ring-3 has-aria-invalid:ring-3 has-data-[slot=combobox-chip]:px-1',
        className,
      )}
      {...props}
    />
  );
}

function ComboboxChip({
  className,
  children,
  showRemove = true,
  removeAriaLabel,
  ...props
}: ComboboxPrimitive.Chip.Props & {
  showRemove?: boolean;
  /** Accessible name for the chip's remove button, e.g. "Remove Pilot". */
  removeAriaLabel?: string;
}) {
  return (
    <ComboboxPrimitive.Chip
      data-slot="combobox-chip"
      className={cn(
        'bg-input text-foreground dark:bg-input/60 flex h-[calc(--spacing(5.25))] w-fit items-center justify-center gap-1 rounded-2xl px-1.5 text-xs font-medium whitespace-nowrap has-disabled:pointer-events-none has-disabled:cursor-not-allowed has-disabled:opacity-50 has-data-[slot=combobox-chip-remove]:pe-0.5',
        className,
      )}
      {...props}
    >
      {children}
      {showRemove && (
        <ComboboxPrimitive.ChipRemove
          render={<Button variant="ghost" size="icon-xs" />}
          className="-ms-0.5 size-4.5 opacity-50 hover:opacity-100 aria-disabled:pointer-events-none"
          data-slot="combobox-chip-remove"
          aria-label={removeAriaLabel}
        >
          <XIcon className="pointer-events-none" />
        </ComboboxPrimitive.ChipRemove>
      )}
    </ComboboxPrimitive.Chip>
  );
}

function ComboboxChipsInput({
  className,
  ...props
}: ComboboxPrimitive.Input.Props) {
  return (
    <ComboboxPrimitive.Input
      data-slot="combobox-chip-input"
      className={cn('min-w-16 flex-1 outline-none', className)}
      {...props}
    />
  );
}

export { ComboboxChips, ComboboxChip, ComboboxChipsInput };
