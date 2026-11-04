// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  cleanup,
  fireEvent,
  getDefaultNormalizer,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  resolveTipAmount,
  TipPageView,
  type TipPageDependencies,
} from './-tip-page';

import { formatMoney } from '@/board/product-view-model';
import { m } from '@/paraglide/messages';
import { getLocale } from '@/paraglide/runtime';
import type { TipJar, TipJarCheckoutStatus } from '@cavuno/board';

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    children,
    ...props
  }: React.PropsWithChildren<{ to: string; className?: string }>) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

// Stripe never loads in jsdom: the checkout step is a marker.
vi.mock('@/components/paywall/embedded-checkout', () => ({
  EmbeddedCheckout: () => <div data-testid="embedded-checkout" />,
}));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function tipJar(overrides: Partial<TipJar> = {}): TipJar {
  return {
    object: 'tip_jar',
    name: 'Support the board',
    description: 'Tips keep it free.',
    descriptionHtml: null,
    currency: 'usd',
    minimumCents: 100,
    suggestedCents: [300, 500, 1000],
    allowNote: true,
    noteMaxLength: 280,
    thankYouMessage: 'Thanks a lot',
    tipCount: 12,
    url: '/tip',
    ...overrides,
  };
}

function dependencies(
  overrides: Partial<TipPageDependencies> = {},
): TipPageDependencies {
  return {
    startCheckout: vi.fn(),
    getCheckoutState: vi.fn(),
    ...overrides,
  };
}

function page(
  jar: TipJar,
  deps: TipPageDependencies,
  sessionId: string | null = null,
) {
  return render(
    <TipPageView
      tipJar={jar}
      boardName="Example Jobs"
      returnPath="/tip"
      sessionId={sessionId}
      dependencies={deps}
    />,
  );
}

const money = (cents: number) => formatMoney(getLocale(), cents, 'usd');

// Prices carry no-break spaces in some languages: compare them as written.
const exactText = {
  normalizer: getDefaultNormalizer({ trim: false, collapseWhitespace: false }),
};

describe('resolveTipAmount', () => {
  const jar = tipJar();

  it('takes a suggested amount as is', () => {
    expect(resolveTipAmount(jar, '2', '', 'en')).toEqual({
      ok: true,
      amountCents: 1000,
    });
  });

  it('checks Other against the minimum and whole minor units, with no cap of its own', () => {
    expect(resolveTipAmount(jar, 'other', '7.25', 'en')).toEqual({
      ok: true,
      amountCents: 725,
    });
    expect(resolveTipAmount(jar, 'other', '0.50', 'en').ok).toBe(false);
    expect(resolveTipAmount(jar, 'other', '1.234', 'en').ok).toBe(false);
    expect(resolveTipAmount(jar, 'other', '', 'en').ok).toBe(false);
    expect(resolveTipAmount(jar, 'other', '5000000', 'en')).toEqual({
      ok: true,
      amountCents: 500_000_000,
    });
  });
});

describe('TipPageView', () => {
  it('shows the tip count and note only when the board allows them', () => {
    page(tipJar({ tipCount: null, allowNote: false }), dependencies());

    expect(screen.queryByLabelText(m.tip_noteLabel())).not.toBeInTheDocument();
    expect(document.querySelector('[data-test="tip-count"]')).toBeNull();

    cleanup();
    page(tipJar(), dependencies());
    expect(screen.getByLabelText(m.tip_noteLabel())).toBeInTheDocument();
    expect(document.querySelector('[data-test="tip-count"]')).not.toBeNull();
  });

  it('words a too-small Other amount under the field without starting checkout', () => {
    const deps = dependencies();
    page(tipJar(), deps);

    fireEvent.click(
      screen.getByRole('radio', { name: m.tip_otherAmountOption() }),
    );
    fireEvent.change(screen.getByLabelText(m.tip_otherAmountLabel()), {
      target: { value: '0.50' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: m.tip_continueAction() }),
    );

    expect(
      screen.getByText(
        m.tip_amountBelowMinimumText({ minimum: money(100) }),
        exactText,
      ),
    ).toBeInTheDocument();
    expect(deps.startCheckout).not.toHaveBeenCalled();
  });

  it('sends the amount and the note, then mounts checkout', async () => {
    const deps = dependencies({
      startCheckout: vi.fn().mockResolvedValue({
        ok: true,
        data: {
          object: 'tip_jar_checkout',
          status: 'open',
          sessionId: 'cs_1',
          clientSecret: 'secret',
          stripeAccountId: 'acct_1',
          publishableKey: 'pk_test',
        },
      }),
    });
    page(tipJar(), deps);

    fireEvent.click(screen.getByRole('radio', { name: money(1000) }));
    fireEvent.change(screen.getByLabelText(m.tip_noteLabel()), {
      target: { value: '  Thanks!  ' },
    });
    fireEvent.click(
      screen.getByRole('button', {
        name: m.tip_submitAction({ amount: money(1000) }),
      }),
    );

    expect(await screen.findByTestId('embedded-checkout')).toBeInTheDocument();
    expect(deps.startCheckout).toHaveBeenCalledWith({
      data: {
        amountCents: 1000,
        note: 'Thanks!',
        website: undefined,
        returnPath: '/tip',
      },
    });
  });

  it('words an API refusal under the field it concerns', async () => {
    const deps = dependencies({
      startCheckout: vi.fn().mockResolvedValue({
        ok: false,
        code: 'tip_note_too_long',
        message: 'Too long',
      }),
    });
    page(tipJar(), deps);

    fireEvent.click(
      screen.getByRole('button', {
        name: m.tip_submitAction({ amount: money(500) }),
      }),
    );

    expect(
      await screen.findByText(m.tip_noteTooLongText({ max: '280' })),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(m.tip_noteLabel())).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  it('thanks the tipper once Stripe returns and the tip is paid', async () => {
    const status: TipJarCheckoutStatus = {
      object: 'tip_jar_checkout_status',
      status: 'paid',
      amountCents: 500,
      currency: 'usd',
      receiptEmail: 'm•••@gmail.com',
      thankYouMessage: 'Thanks a lot',
    };
    const deps = dependencies({
      getCheckoutState: vi.fn().mockResolvedValue({ ok: true, data: status }),
    });
    page(tipJar(), deps, 'cs_paid');

    expect(
      await screen.findByRole('heading', { name: m.tip_thankYouTitle() }),
    ).toBeInTheDocument();
    expect(screen.getByText('Thanks a lot')).toBeInTheDocument();
    expect(
      screen.getByText(m.tip_receiptSentText({ email: 'm•••@gmail.com' })),
    ).toBeInTheDocument();
    expect(deps.getCheckoutState).toHaveBeenCalledWith({
      data: { sessionId: 'cs_paid' },
    });
  });

  it('shows processing while the payment clears', async () => {
    const deps = dependencies({
      getCheckoutState: vi.fn().mockResolvedValue({
        ok: true,
        data: {
          object: 'tip_jar_checkout_status',
          status: 'processing',
          amountCents: 500,
          currency: 'usd',
          receiptEmail: null,
          thankYouMessage: null,
        },
      }),
    });
    page(tipJar(), deps, 'cs_slow');

    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: m.tip_processingTitle() }),
      ).toBeInTheDocument(),
    );
  });
});
