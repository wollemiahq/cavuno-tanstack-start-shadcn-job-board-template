import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { m } from '@/paraglide/messages';

/**
 * Billing details for an invoice-collected (net-terms) plan.
 *
 * The platform REQUIRES company name plus street/city/country before it will
 * raise an invoice — `validateInvoiceBillingDetails` pushes one error per
 * missing part and the checkout 422s. The starter previously collected none
 * of this and sent no `invoiceBilling` at all, so every invoice plan failed
 * 100% of the time, and both job forms still rendered an "invoice sent"
 * success screen for the branch. Postal code is deliberately optional — not
 * every country uses one — and the tax ID is optional B2B data that Stripe
 * carries as `customer.tax_ids` for reverse charge.
 */
export interface InvoiceBillingDraft {
  email: string;
  billingName: string;
  line1: string;
  city: string;
  postalCode: string;
  country: string;
  taxId: string;
}

export function emptyInvoiceBillingDraft(email = ''): InvoiceBillingDraft {
  return {
    email,
    billingName: '',
    line1: '',
    city: '',
    postalCode: '',
    country: '',
    taxId: '',
  };
}

/**
 * The parts the platform refuses to raise an invoice without.
 *
 * `requireEmail` is false on the public `/post` flow: that body carries no
 * `email` field at all and the platform falls back to the contact email the
 * wizard already collects. The employer checkout body does take one.
 */
export function invoiceBillingIncomplete(
  draft: InvoiceBillingDraft,
  { requireEmail = true }: { requireEmail?: boolean } = {},
): boolean {
  return (
    draft.billingName.trim() === '' ||
    draft.line1.trim() === '' ||
    draft.city.trim() === '' ||
    draft.country.trim() === '' ||
    (requireEmail && !draft.email.includes('@'))
  );
}

const trimmed = (value: string) => value.trim();

/** Structured address the invoice validator anchors the tax document on. */
export interface InvoiceBillingAddressBody {
  line1: string;
  city: string;
  country: string;
  postalCode?: string;
}

/** Public `/post` submit shape — no `email`; the wizard's contact email is used. */
export interface PublicInvoiceBillingBody {
  billingName: string;
  address: InvoiceBillingAddressBody;
  taxId?: string;
}

/** Employer checkout shape — the same, plus the billing email it accepts. */
export interface EmployerInvoiceBillingBody extends PublicInvoiceBillingBody {
  email: string;
}

function addressBody(draft: InvoiceBillingDraft): InvoiceBillingAddressBody {
  const address: InvoiceBillingAddressBody = {
    line1: trimmed(draft.line1),
    city: trimmed(draft.city),
    country: trimmed(draft.country),
  };
  const postalCode = trimmed(draft.postalCode);
  if (postalCode) address.postalCode = postalCode;
  return address;
}

/**
 * Wire shape for the public `/post` submit. Deliberately omits `email`: that
 * body has no such field, and sending one is an unrecognized key the API
 * rejects. The invoice goes to the wizard's contact email.
 */
export function publicInvoiceBillingBody(
  draft: InvoiceBillingDraft,
): PublicInvoiceBillingBody {
  const body: PublicInvoiceBillingBody = {
    billingName: trimmed(draft.billingName),
    address: addressBody(draft),
  };
  const taxId = trimmed(draft.taxId);
  if (taxId) body.taxId = taxId;
  return body;
}

/** Wire shape for `EmployerCheckoutBody.invoiceBilling` — carries `email`. */
export function invoiceBillingBody(
  draft: InvoiceBillingDraft,
): EmployerInvoiceBillingBody {
  return { ...publicInvoiceBillingBody(draft), email: trimmed(draft.email) };
}

export function InvoiceBillingFields({
  value,
  onChange,
  invalid,
  idPrefix = 'invoice-billing',
  showEmail = true,
}: {
  value: InvoiceBillingDraft;
  onChange: (next: InvoiceBillingDraft) => void;
  invalid?: boolean;
  idPrefix?: string;
  /** The public wizard already collects a contact email; don't ask twice. */
  showEmail?: boolean;
}) {
  const set = <K extends keyof InvoiceBillingDraft>(
    key: K,
    next: InvoiceBillingDraft[K],
  ) => onChange({ ...value, [key]: next });

  return (
    <div className="grid gap-5" data-slot="invoice-billing-fields">
      {showEmail ? (
        <Field>
          <FieldLabel htmlFor={`${idPrefix}-email`}>
            {m.invoiceBilling_emailLabel()}
          </FieldLabel>
          <Input
            id={`${idPrefix}-email`}
            type="email"
            autoComplete="email"
            value={value.email}
            onChange={(event) => set('email', event.currentTarget.value)}
          />
          <FieldDescription>
            {m.invoiceBilling_emailHelperText()}
          </FieldDescription>
        </Field>
      ) : null}

      <Field>
        <FieldLabel htmlFor={`${idPrefix}-name`}>
          {m.invoiceBilling_nameLabel()}
        </FieldLabel>
        <Input
          id={`${idPrefix}-name`}
          autoComplete="organization"
          value={value.billingName}
          onChange={(event) => set('billingName', event.currentTarget.value)}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor={`${idPrefix}-line1`}>
          {m.invoiceBilling_line1Label()}
        </FieldLabel>
        <Input
          id={`${idPrefix}-line1`}
          autoComplete="address-line1"
          value={value.line1}
          onChange={(event) => set('line1', event.currentTarget.value)}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-3">
        <Field>
          <FieldLabel htmlFor={`${idPrefix}-city`}>
            {m.invoiceBilling_cityLabel()}
          </FieldLabel>
          <Input
            id={`${idPrefix}-city`}
            autoComplete="address-level2"
            value={value.city}
            onChange={(event) => set('city', event.currentTarget.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${idPrefix}-postal`}>
            {m.invoiceBilling_postalLabel()}
          </FieldLabel>
          <Input
            id={`${idPrefix}-postal`}
            autoComplete="postal-code"
            value={value.postalCode}
            onChange={(event) => set('postalCode', event.currentTarget.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${idPrefix}-country`}>
            {m.invoiceBilling_countryLabel()}
          </FieldLabel>
          <Input
            id={`${idPrefix}-country`}
            autoComplete="country-name"
            value={value.country}
            onChange={(event) => set('country', event.currentTarget.value)}
          />
        </Field>
      </div>

      <Field data-invalid={invalid || undefined}>
        <FieldLabel htmlFor={`${idPrefix}-tax-id`}>
          {m.invoiceBilling_taxIdLabel()}
        </FieldLabel>
        <Input
          id={`${idPrefix}-tax-id`}
          value={value.taxId}
          onChange={(event) => set('taxId', event.currentTarget.value)}
        />
        {invalid ? (
          <FieldError>{m.invoiceBilling_requiredError()}</FieldError>
        ) : null}
      </Field>
    </div>
  );
}
