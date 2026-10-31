'use client';

/**
 * The buy dialog: the "Before you pay" form in a centred dialog, or in a
 * bottom sheet on a phone. The price card behind it never changes. It closes
 * with its ✕, Escape or a press outside; closing drops what was typed, so
 * the next open starts clean (a signed-in buyer's email is filled again).
 */
import { useRef, useSyncExternalStore, type ComponentProps } from 'react';

import { m } from '../../paraglide/messages';

import { ProductCheckoutForm } from '@/components/board/product-checkout-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

/** Below `md`: the phone layout, where the dialog becomes a bottom sheet. */
const PHONE_QUERY = '(max-width: 767px)';

function subscribe(onChange: () => void) {
  const query = window.matchMedia(PHONE_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

/** Read on the first client render, so the sheet never opens as a dialog. */
function useIsPhone(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(PHONE_QUERY).matches,
    () => false,
  );
}

/** Fields a buyer fills in; the honeypot is out of the tab order. */
const FILLABLE =
  'input:not([type="hidden"]):not([tabindex="-1"]), select, textarea';

/**
 * The email field, or the first field still to fill when the email is
 * already there (a signed-in buyer), so typing can start at once.
 */
function firstFieldToFill(form: HTMLElement | null): HTMLElement | null {
  if (!form) return null;
  const fields = [...form.querySelectorAll<HTMLElement>(FILLABLE)];
  const empty = fields.find(
    (field) =>
      (field instanceof HTMLInputElement ||
        field instanceof HTMLSelectElement ||
        field instanceof HTMLTextAreaElement) &&
      field.type !== 'checkbox' &&
      field.value === '',
  );
  return empty ?? fields[0] ?? null;
}

type FormProps = ComponentProps<typeof ProductCheckoutForm>;

export function ProductCheckoutDialog({
  open,
  onOpenChange,
  description,
  ...formProps
}: FormProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** "Resume pack · $19". */
  description: string;
}) {
  const phone = useIsPhone();
  const bodyRef = useRef<HTMLDivElement>(null);
  const title =
    formProps.product.price.kind === 'free'
      ? m.product_freeStepTitle()
      : m.product_paidStepTitle();
  const initialFocus = () => firstFieldToFill(bodyRef.current) ?? true;
  const form = (
    <div ref={bodyRef}>
      <ProductCheckoutForm {...formProps} />
    </div>
  );

  if (phone) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          initialFocus={initialFocus}
          className="max-h-[90dvh] rounded-t-xl"
          data-slot="product-checkout-sheet"
        >
          <SheetHeader className="pe-14">
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>{description}</SheetDescription>
          </SheetHeader>
          {/* Long forms (many questions) scroll inside the sheet. */}
          <div className="overflow-y-auto px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            {form}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        initialFocus={initialFocus}
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto"
        data-slot="product-checkout-dialog"
      >
        <DialogHeader className="pe-10">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {form}
      </DialogContent>
    </Dialog>
  );
}
