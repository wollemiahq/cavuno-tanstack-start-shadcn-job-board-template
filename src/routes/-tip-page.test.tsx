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
    coverFee: null,
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

const noteField = () =>
  screen.getByLabelText(m.tip_noteLabel({ boardName: 'Example Jobs' }));

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
  it('shows how many people tipped only while the board shows the count', () => {
    const countText = (count: number) =>
      m.tip_tippedCountText({
        count,
        countLabel: new Intl.NumberFormat(getLocale()).format(count),
      });

    page(tipJar({ tipCount: null }), dependencies());
    expect(document.querySelector('[data-test="tip-count"]')).toBeNull();

    cleanup();
    page(tipJar({ tipCount: 1 }), dependencies());
    expect(screen.getByText(countText(1), exactText)).toBeInTheDocument();

    cleanup();
    page(tipJar({ tipCount: 128 }), dependencies());
    expect(screen.getByText(countText(128), exactText)).toBeInTheDocument();
  });

  it('offers no note when the board takes none', () => {
    page(tipJar({ allowNote: false }), dependencies());

    expect(
      screen.queryByRole('button', { name: m.tip_addNoteAction() }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('opens the note on request, and Remove drops it from the tip', async () => {
    const deps = dependencies({
      startCheckout: vi.fn().mockResolvedValue({
        ok: false,
        code: 'rate_limited',
        message: 'Slow down',
      }),
    });
    page(tipJar(), deps);
    const noteLabel = m.tip_noteLabel({ boardName: 'Example Jobs' });

    expect(screen.queryByLabelText(noteLabel)).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: m.tip_addNoteAction() }),
    );
    const note = screen.getByLabelText(noteLabel);
    expect(note).toHaveFocus();
    fireEvent.change(note, { target: { value: 'Thanks!' } });
    expect(
      screen.getByText(m.tip_noteCountText({ count: '7', max: '280' })),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: m.tip_removeNoteAction() }),
    );
    expect(screen.queryByLabelText(noteLabel)).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: m.tip_addNoteAction() }),
    ).toHaveFocus();

    fireEvent.click(
      screen.getByRole('button', {
        name: m.tip_submitAction({ amount: money(500) }),
      }),
    );
    await waitFor(() => expect(deps.startCheckout).toHaveBeenCalled());
    expect(deps.startCheckout).toHaveBeenCalledWith({
      data: {
        amountCents: 500,
        note: undefined,
        website: undefined,
        returnPath: '/tip',
      },
    });

    // Opened again, it starts empty.
    fireEvent.click(
      screen.getByRole('button', { name: m.tip_addNoteAction() }),
    );
    expect(screen.getByLabelText(noteLabel)).toHaveValue('');
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
    fireEvent.click(
      screen.getByRole('button', { name: m.tip_addNoteAction() }),
    );
    fireEvent.change(noteField(), {
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
      screen.getByRole('button', { name: m.tip_addNoteAction() }),
    );
    fireEvent.change(noteField(), { target: { value: 'Thanks!' } });
    fireEvent.click(
      screen.getByRole('button', {
        name: m.tip_submitAction({ amount: money(500) }),
      }),
    );

    expect(
      await screen.findByText(m.tip_noteTooLongText({ max: '280' })),
    ).toBeInTheDocument();
    expect(noteField()).toHaveAttribute('aria-invalid', 'true');
  });

  it('thanks the tipper once Stripe returns and the tip is paid', async () => {
    const status: TipJarCheckoutStatus = {
      object: 'tip_jar_checkout_status',
      status: 'paid',
      amountCents: 500,
      coverFeeCents: 0,
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

  describe('covering the card fee', () => {
    // A US card rate: 2.9% + 30¢.
    const rate = { percentBps: 290, fixedMinor: 30 };
    const coverFeeBox = (feeCents: number) =>
      screen.getByRole('checkbox', {
        name: m.tip_coverFeeLabel({ fee: money(feeCents) }),
      });
    const refused = () =>
      dependencies({
        startCheckout: vi.fn().mockResolvedValue({
          ok: false,
          code: 'rate_limited',
          message: 'Slow down',
        }),
      });

    it('is not offered when the board does not pass the fee on', () => {
      page(tipJar({ coverFee: null }), dependencies());

      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    });

    it('prices the fee for the chosen amount, unticked, and only while the amount is valid', () => {
      page(tipJar({ coverFee: rate }), dependencies());

      // $5.00: ceil(530 / 0.971) = 546, so the fee is 46¢.
      expect(coverFeeBox(46)).not.toBeChecked();
      expect(
        screen.getByRole('button', {
          name: m.tip_submitAction({ amount: money(500) }),
        }),
      ).toBeInTheDocument();

      // $10.00: ceil(1030 / 0.971) = 1061, so the fee is 61¢.
      fireEvent.click(screen.getByRole('radio', { name: money(1000) }));
      expect(coverFeeBox(61)).toBeInTheDocument();

      fireEvent.click(
        screen.getByRole('radio', { name: m.tip_otherAmountOption() }),
      );
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
      fireEvent.change(screen.getByLabelText(m.tip_otherAmountLabel()), {
        target: { value: '0.50' },
      });
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
      // $7.25: ceil(755 / 0.971) = 778, so the fee is 53¢.
      fireEvent.change(screen.getByLabelText(m.tip_otherAmountLabel()), {
        target: { value: '7.25' },
      });
      expect(coverFeeBox(53)).toBeInTheDocument();
    });

    it('adds the fee to the button and asks checkout to charge it once ticked', async () => {
      const deps = refused();
      page(tipJar({ coverFee: rate }), deps);

      fireEvent.click(coverFeeBox(46));
      expect(coverFeeBox(46)).toBeChecked();
      fireEvent.click(
        screen.getByRole('button', {
          name: m.tip_submitAction({ amount: money(546) }),
        }),
      );

      await waitFor(() => expect(deps.startCheckout).toHaveBeenCalled());
      expect(deps.startCheckout).toHaveBeenCalledWith({
        data: {
          amountCents: 500,
          note: undefined,
          website: undefined,
          coverFee: true,
          returnPath: '/tip',
        },
      });
    });

    it('sends no coverFee at all while unticked', async () => {
      const deps = refused();
      page(tipJar({ coverFee: rate }), deps);

      fireEvent.click(
        screen.getByRole('button', {
          name: m.tip_submitAction({ amount: money(500) }),
        }),
      );

      await waitFor(() => expect(deps.startCheckout).toHaveBeenCalled());
      const [{ data }] = vi.mocked(deps.startCheckout).mock.calls[0]!;
      expect(data).not.toHaveProperty('coverFee');
    });

    it('unticks the box and says so when the board stopped offering it', async () => {
      const deps = dependencies({
        startCheckout: vi.fn().mockResolvedValue({
          ok: false,
          code: 'tip_fee_cover_not_allowed',
          message: 'Not allowed',
        }),
      });
      page(tipJar({ coverFee: rate }), deps);

      fireEvent.click(coverFeeBox(46));
      fireEvent.click(
        screen.getByRole('button', {
          name: m.tip_submitAction({ amount: money(546) }),
        }),
      );

      expect(
        await screen.findByText(m.tip_coverFeeNotAllowedText()),
      ).toBeInTheDocument();
      expect(coverFeeBox(46)).not.toBeChecked();
      expect(
        screen.getByRole('button', {
          name: m.tip_submitAction({ amount: money(500) }),
        }),
      ).toBeInTheDocument();
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
          coverFeeCents: 0,
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
