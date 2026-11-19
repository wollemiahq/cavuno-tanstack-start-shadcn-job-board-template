// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ProductCheckoutForm } from './product-checkout-form';

import { m } from '@/paraglide/messages';
import type { Product } from '@cavuno/board';

afterEach(cleanup);

const WAIVER_ID = 'q_waiver';
const BOARD = 'Acme Jobs';

function product(overrides: Partial<Product> = {}): Product {
  return {
    object: 'product',
    slug: 'guide',
    name: 'Guide',
    description: null,
    descriptionHtml: null,
    salesCount: null,
    summary: null,
    details: [],
    images: [],
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
  fireEvent.change(screen.getByLabelText(m.product_emailForDownloadLabel()), {
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
        boardName={BOARD}
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

  it('offers a likely correction on blur, and checks out with it', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <ProductCheckoutForm
        product={product({ questions: [] })}
        onSubmit={onSubmit}
        boardName={BOARD}
      />,
    );
    const email = screen.getByLabelText(m.product_emailForDownloadLabel());

    fillEmail('ada@example.com');
    fireEvent.blur(email);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    fillEmail('ada@gmial.com');
    fireEvent.blur(email);
    expect(await screen.findByRole('status')).toHaveTextContent(
      m.product_emailSuggestionText({ email: 'ada@gmail.com' }),
    );
    // Editing hides a hint that no longer matches the address.
    fillEmail('ada@gmial.co');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    fillEmail('ada@gmial.com');
    fireEvent.blur(email);
    fireEvent.click(
      await screen.findByRole('button', { name: 'ada@gmail.com' }),
    );
    expect(email).toHaveValue('ada@gmail.com');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    submit();
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]![0]).toMatchObject({
      email: 'ada@gmail.com',
    });
  });

  it('stops the first checkout of a likely typo, and sends it on the second', async () => {
    const onSubmit = vi.fn(
      (_values: { email: string }) => new Promise<undefined>(() => {}),
    );
    render(
      <ProductCheckoutForm
        product={product({ questions: [] })}
        onSubmit={onSubmit}
        boardName={BOARD}
      />,
    );
    const email = screen.getByLabelText(m.product_emailForDownloadLabel());

    // Submitted without the field ever losing focus (Enter, or a click
    // that beats the blur check).
    fillEmail('ada@gmial.com');
    submit();
    const hint = await screen.findByRole('button', { name: 'ada@gmail.com' });
    expect(onSubmit).not.toHaveBeenCalled();

    submit();
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]![0]).toMatchObject({
      email: 'ada@gmial.com',
    });

    // The checkout is pending: taking the correction now would change the
    // address under a request already sent.
    await vi.waitFor(() => expect(hint).toBeDisabled());
    fireEvent.click(hint);
    expect(email).toHaveValue('ada@gmial.com');
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
        boardName={BOARD}
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
        boardName={BOARD}
      />,
    );
    fillEmail();
    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      m.boardError_productSoldOutText(),
    );
  });

  it.each([
    ['a free', { kind: 'free', currency: null, amountCents: 0 }],
    ['a paid', { kind: 'fixed', currency: 'eur', amountCents: 1900 }],
  ] as const)(
    'asks %s checkout for marketing email, unticked, and sends its wording only once ticked',
    async (_, price) => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      render(
        <ProductCheckoutForm
          product={product({ questions: [], price })}
          defaultEmail="ada@example.com"
          onSubmit={onSubmit}
          boardName={BOARD}
        />,
      );
      const wording = m.emailPreferences_marketingConsent({ board: BOARD });
      // The API refuses consent wording that doesn't name the board.
      expect(wording).toContain(BOARD);
      const box = screen.getByRole('checkbox', { name: wording });
      expect(
        screen.getByLabelText(
          price.kind === 'free'
            ? m.product_emailLabel()
            : m.product_emailForDownloadLabel(),
        ),
      ).toHaveValue('ada@example.com');
      expect(box).not.toBeChecked();
      const send = () =>
        fireEvent.click(
          screen.getByRole('button', {
            name:
              price.kind === 'free'
                ? m.product_sendFilesAction()
                : m.product_continueToPaymentAction(),
          }),
        );

      send();
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(onSubmit.mock.calls[0]?.[0].marketingConsent).toBeUndefined();
      expect(onSubmit.mock.calls[0]?.[0]).not.toHaveProperty('jobAlertOptIn');

      fireEvent.click(box);
      send();
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2));
      expect(onSubmit.mock.calls[1]?.[0].marketingConsent).toEqual({
        granted: true,
        text: wording,
      });
    },
  );
});
