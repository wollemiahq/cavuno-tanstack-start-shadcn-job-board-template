// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ProductCheckoutForm } from './product-checkout-form';

import { m } from '@/paraglide/messages';
import type { Product } from '@cavuno/board';

afterEach(cleanup);

const WAIVER_ID = 'q_waiver';

function product(overrides: Partial<Product> = {}): Product {
  return {
    object: 'product',
    slug: 'guide',
    name: 'Guide',
    description: null,
    summary: null,
    details: [],
    images: [],
    buttonLabel: null,
    price: { kind: 'fixed', currency: 'eur', amountCents: 1900 },
    soldOut: false,
    refundPolicy: null,
    questions: [
      {
        id: WAIVER_ID,
        kind: 'checkbox',
        label: 'I waive my right to cancel',
        required: true,
        options: null,
      },
    ],
    contents: [],
    facts: {
      fileCount: 1,
      linkCount: 0,
      fileTypes: ['pdf'],
      pageCount: null,
      totalSizeBytes: 1,
    },
    isListed: true,
    ratingsEnabled: false,
    rating: null,
    url: '/products/guide',
    ...overrides,
  };
}

function fillEmail(value = 'ada@example.com') {
  fireEvent.change(screen.getByLabelText(m.product_emailLabel()), {
    target: { value },
  });
}

function submit() {
  fireEvent.click(
    screen.getByRole('button', { name: m.product_continueToPaymentAction() }),
  );
}

describe('ProductCheckoutForm', () => {
  it('holds back checkout until the required waiver is ticked', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <ProductCheckoutForm
        product={product()}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    );
    fillEmail();
    submit();
    expect(
      await screen.findByText(m.product_checkboxRequiredText()),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('checkbox', { name: /waive/ }));
    submit();
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]![0]).toMatchObject({
      email: 'ada@example.com',
      answers: [{ questionId: WAIVER_ID, value: true }],
    });
    expect(onSubmit.mock.calls[0]![0].website).toBeUndefined();
  });

  it('refuses a pay-what-you-want amount under the minimum', async () => {
    const onSubmit = vi.fn();
    render(
      <ProductCheckoutForm
        product={product({
          questions: [],
          price: {
            kind: 'pay_what_you_want',
            currency: 'eur',
            amountCents: 500,
            minimumCents: 500,
            suggestedCents: null,
          },
        })}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    );
    fillEmail();
    fireEvent.change(screen.getByLabelText(m.product_amountLabel()), {
      target: { value: '2' },
    });
    submit();
    const amount = screen.getByLabelText(m.product_amountLabel());
    await vi.waitFor(() =>
      expect(amount).toHaveAttribute('aria-invalid', 'true'),
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('words a sold-out refusal next to the button', async () => {
    const onSubmit = vi
      .fn()
      .mockResolvedValue({ code: 'product_sold_out', message: 'Sold out' });
    render(
      <ProductCheckoutForm
        product={product({ questions: [] })}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    );
    fillEmail();
    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      m.boardError_productSoldOutText(),
    );
  });

  it('offers the job-alert opt-in on free products only', () => {
    render(
      <ProductCheckoutForm
        product={product({
          questions: [],
          price: { kind: 'free', currency: null, amountCents: 0 },
        })}
        onSubmit={vi.fn()}
        onCancel={() => {}}
      />,
    );
    expect(
      screen.getByRole('checkbox', { name: m.product_jobAlertOptInLabel() }),
    ).not.toBeChecked();
  });
});
