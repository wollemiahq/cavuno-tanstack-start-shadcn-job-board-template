// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  emptyInvoiceBillingDraft,
  InvoiceBillingFields,
  invoiceBillingBody,
  invoiceBillingIncomplete,
  publicInvoiceBillingBody,
} from './invoice-billing-fields';

import { renderRouted } from '@/test/render-routed';

/**
 * The platform refuses to raise an invoice without a company name and a
 * street/city/country — `validateInvoiceBillingDetails` pushes one error per
 * missing part and the checkout 422s. The starter collected none of it and
 * sent no `invoiceBilling` at all, so every invoice-collected plan failed
 * 100% of the time while both job forms still rendered an "invoice sent"
 * success screen for that branch.
 */
afterEach(cleanup);

const complete = {
  ...emptyInvoiceBillingDraft('billing@acme.test'),
  billingName: 'Acme Ltd',
  line1: '1 Test Street',
  city: 'London',
  country: 'GB',
};

describe('invoice billing completeness', () => {
  it.each([
    ['company name', { billingName: '' }],
    ['street address', { line1: '' }],
    ['city', { city: '' }],
    ['country', { country: '' }],
  ])('treats a missing %s as incomplete', (_label, missing) => {
    expect(invoiceBillingIncomplete({ ...complete, ...missing })).toBe(true);
  });

  it('accepts a complete draft', () => {
    expect(invoiceBillingIncomplete(complete)).toBe(false);
  });

  it('does not require an email — the platform falls back to the contact address', () => {
    // `employer-checkout.ts` resolves the recipient as
    // `invoiceBilling?.email?.trim() || contactEmail`. Requiring it here
    // would block a submit the API accepts.
    expect(invoiceBillingIncomplete({ ...complete, email: '' })).toBe(false);
  });

  it('postal code stays optional — not every country uses one', () => {
    expect(invoiceBillingIncomplete({ ...complete, postalCode: '' })).toBe(
      false,
    );
  });
});

describe('invoice billing wire shapes', () => {
  it('sends trimmed values and omits empty optionals', () => {
    const body = invoiceBillingBody({
      ...complete,
      billingName: '  Acme Ltd  ',
      postalCode: '',
      taxId: '',
    });
    expect(body).toEqual({
      email: 'billing@acme.test',
      billingName: 'Acme Ltd',
      address: { line1: '1 Test Street', city: 'London', country: 'GB' },
    });
  });

  it('omits a blank email rather than sending an empty string', () => {
    // Sending '' would work by accident via the platform's `|| contactEmail`
    // fallback. Omitting it makes the fallback the contract.
    expect(invoiceBillingBody({ ...complete, email: '' })).not.toHaveProperty(
      'email',
    );
  });

  it('carries postal code and tax id when given', () => {
    const body = invoiceBillingBody({
      ...complete,
      postalCode: 'EC1A 1BB',
      taxId: 'GB123456789',
    });
    expect(body.address).toMatchObject({ postalCode: 'EC1A 1BB' });
    expect(body.taxId).toBe('GB123456789');
  });

  it('omits email from the public body — it is not a field there', () => {
    const body = publicInvoiceBillingBody(complete);
    expect(body).not.toHaveProperty('email');
    expect(body.billingName).toBe('Acme Ltd');
  });
});

describe('InvoiceBillingFields', () => {
  it('collects every part the platform requires', async () => {
    const onChange = vi.fn();
    await renderRouted(
      <InvoiceBillingFields
        value={emptyInvoiceBillingDraft()}
        onChange={onChange}
      />,
    );
    for (const label of [
      'Billing email',
      'Company name',
      'Street address',
      'City',
      'Country',
    ]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
  });

  it('hides the email field where the wire has none', async () => {
    await renderRouted(
      <InvoiceBillingFields
        value={emptyInvoiceBillingDraft()}
        onChange={() => {}}
        showEmail={false}
      />,
    );
    expect(screen.queryByLabelText('Billing email')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Company name')).toBeInTheDocument();
  });

  it('reports edits without dropping the rest of the draft', async () => {
    const onChange = vi.fn();
    await renderRouted(
      <InvoiceBillingFields value={complete} onChange={onChange} />,
    );
    fireEvent.change(screen.getByLabelText('City'), {
      target: { value: 'Berlin' },
    });
    expect(onChange).toHaveBeenCalledWith({ ...complete, city: 'Berlin' });
  });
});
