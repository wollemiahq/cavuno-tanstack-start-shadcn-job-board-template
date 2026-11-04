// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { type ReactElement, useState } from 'react';

import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from '@tanstack/react-router';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  ItemVerificationCard,
  type ItemVerificationActions,
  ItemVerificationTick,
} from './item-verification';

import type { VerifiableItem } from '@/board/item-verification';
import { m } from '@/paraglide/messages';
import type { ItemVerification } from '@cavuno/board';

vi.mock('@/server/item-verification', () => ({
  submitProfileItemVerification: vi.fn(),
  startProfileItemEmailCheck: vi.fn(),
  confirmProfileItemEmailCode: vi.fn(),
}));

beforeAll(() => {
  // jsdom has no layout; the one-time code input probes it for password
  // manager badges once focused.
  document.elementFromPoint = () => null;
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

async function mount(node: ReactElement) {
  const root = createRootRoute({ component: () => node });
  const router = createRouter({
    routeTree: root,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  vi.spyOn(router, 'invalidate').mockResolvedValue(undefined);
  await act(async () => {
    render(<RouterProvider router={router} />);
    await router.load();
  });
  return router;
}

const emailItem: VerifiableItem = {
  itemKey: 'experience:exp1',
  label: 'Acme',
  method: 'email_domain',
  verification: null,
};

function row(status: ItemVerification['status']): ItemVerification {
  return {
    id: 'iv1',
    object: 'item_verification',
    itemKey: 'experience:exp1',
    status,
    lapseReason: null,
    reasonCode: null,
    verifiedAt: null,
    expiresAt: null,
    hasProof: false,
    verifiedDomain: null,
    updatedAt: '2026-11-01T00:00:00.000Z',
  };
}

function sent(
  overrides: { retryAfterSeconds?: number; codeExpiresAt?: string } = {},
) {
  return {
    ok: true,
    data: {
      emailDomain: 'acme.com',
      sent: true,
      retryAfterSeconds: 60,
      codeExpiresAt: new Date(Date.now() + 600_000).toISOString(),
      ...overrides,
    },
  };
}

function verifyName(item = 'Acme') {
  return m.itemVerification_actionAriaLabel({ item });
}

async function openDialog() {
  fireEvent.click(screen.getByRole('button', { name: verifyName() }));
  return screen.findByRole('dialog');
}

async function sendCodeTo(address: string) {
  fireEvent.change(
    await screen.findByLabelText(m.itemVerification_emailLabel()),
    { target: { value: address } },
  );
  fireEvent.click(
    screen.getByRole('button', { name: m.itemVerification_sendCodeLabel() }),
  );
}

function emailActions(
  overrides: Partial<Required<ItemVerificationActions>> = {},
) {
  return {
    requestReview: vi.fn().mockResolvedValue({ ok: true, data: {} }),
    startEmailCheck: vi.fn().mockResolvedValue(sent()),
    confirmEmailCode: vi.fn().mockResolvedValue({ ok: true, data: {} }),
    ...overrides,
  };
}

describe('ItemVerificationTick', () => {
  it.each([
    [null, 'none'],
    ['changed', 'none'],
    ['rejected', 'none'],
    ['needs_info', 'review'],
  ] as const)(
    'a %s item is a "Verify" button with the %s look',
    async (status, tone) => {
      await mount(
        <ItemVerificationTick
          item={{ ...emailItem, verification: status ? row(status) : null }}
          actions={emailActions()}
        />,
      );
      const tick = screen.getByRole('button', { name: verifyName() });
      expect(tick).toHaveAttribute('data-tone', tone);
    },
  );

  it.each([
    ['verified', 'verified', () => m.itemVerification_verifiedLabel()],
    ['pending', 'review', () => m.itemVerification_pendingLabel()],
    ['revoked', 'none', () => m.itemVerification_revokedLabel()],
  ] as const)(
    'a %s item shows its status, not a button',
    async (status, tone, label) => {
      await mount(
        <ItemVerificationTick
          item={{ ...emailItem, verification: row(status) }}
          actions={emailActions()}
        />,
      );
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      expect(screen.getByRole('img', { name: label() })).toHaveAttribute(
        'data-tone',
        tone,
      );
    },
  );

  it('names the status in a tooltip on hover', async () => {
    await mount(
      <ItemVerificationTick
        item={{ ...emailItem, verification: row('pending') }}
        actions={emailActions()}
      />,
    );
    fireEvent.pointerEnter(
      screen.getByRole('img', { name: m.itemVerification_pendingLabel() }),
    );
    expect(
      await screen.findByText(m.itemVerification_pendingLabel(), {
        selector: '[data-slot=tooltip-content]',
      }),
    ).toBeInTheDocument();
  });

  it('checks the work email in a dialog: address, code, verified', async () => {
    const actions = emailActions({
      confirmEmailCode: vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          code: 'item_verification_invalid_code',
        })
        .mockResolvedValueOnce({ ok: true, data: {} }),
    });
    const router = await mount(
      <ItemVerificationTick
        item={{ ...emailItem, emailDomain: 'acme.com' }}
        actions={actions}
      />,
    );

    const dialog = await openDialog();
    expect(dialog).toHaveTextContent(verifyName());
    // The item's domain completes the address.
    expect(await screen.findByText('@acme.com')).toBeInTheDocument();
    await sendCodeTo('ada');

    expect(
      await screen.findByText(
        m.itemVerification_codeIntro({ email: 'ada@acme.com' }),
        { exact: false },
      ),
    ).toBeInTheDocument();
    expect(actions.startEmailCheck).toHaveBeenCalledWith(
      'experience:exp1',
      'ada@acme.com',
    );
    expect(
      screen.getByRole('button', {
        name: m.itemVerification_resendInLabel({ seconds: 60 }),
      }),
    ).toBeDisabled();

    const code = screen.getByLabelText(m.itemVerification_codeLabel());
    fireEvent.change(code, { target: { value: '123456' } });
    expect(
      await screen.findByText(m.itemVerification_codeInvalidError()),
    ).toBeInTheDocument();
    // A wrong code clears the input for the next try.
    expect(code).toHaveValue('');

    fireEvent.change(code, { target: { value: '654321' } });
    await waitFor(() => expect(router.invalidate).toHaveBeenCalled());
    expect(actions.confirmEmailCode).toHaveBeenLastCalledWith(
      'experience:exp1',
      '654321',
    );
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(actions.requestReview).not.toHaveBeenCalled();
  });

  it('uses a full address as typed', async () => {
    const actions = emailActions();
    await mount(
      <ItemVerificationTick
        item={{ ...emailItem, emailDomain: 'acme.com' }}
        actions={actions}
      />,
    );

    await openDialog();
    await sendCodeTo('ada@eu.acme.com');
    await waitFor(() =>
      expect(actions.startEmailCheck).toHaveBeenCalledWith(
        'experience:exp1',
        'ada@eu.acme.com',
      ),
    );
  });

  it('says when the code expired and sends a new one', async () => {
    const actions = emailActions({
      startEmailCheck: vi
        .fn()
        .mockResolvedValueOnce(
          sent({
            retryAfterSeconds: 0,
            codeExpiresAt: new Date(Date.now() - 1000).toISOString(),
          }),
        )
        .mockResolvedValueOnce(sent()),
      confirmEmailCode: vi.fn(),
    });
    await mount(<ItemVerificationTick item={emailItem} actions={actions} />);

    await openDialog();
    await sendCodeTo('ada@acme.com');
    expect(
      await screen.findByText(m.itemVerification_codeExpiredError()),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: m.itemVerification_resendLabel() }),
    );
    await waitFor(() =>
      expect(
        screen.queryByText(m.itemVerification_codeExpiredError()),
      ).not.toBeInTheDocument(),
    );
    expect(actions.startEmailCheck).toHaveBeenCalledTimes(2);
    expect(actions.confirmEmailCode).not.toHaveBeenCalled();
  });

  it('closes on cancel', async () => {
    const actions = emailActions();
    await mount(<ItemVerificationTick item={emailItem} actions={actions} />);

    await openDialog();
    fireEvent.click(
      screen.getByRole('button', { name: m.itemVerification_cancelLabel() }),
    );
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(actions.startEmailCheck).not.toHaveBeenCalled();
  });

  it('explains why and asks the board for an item with no email check', async () => {
    const actions = emailActions();
    const router = await mount(
      <ItemVerificationTick
        item={{ ...emailItem, method: 'team' }}
        actions={actions}
      />,
    );

    await openDialog();
    expect(
      screen.getByText(m.itemVerification_teamExperienceBody()),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText(m.itemVerification_emailLabel()),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: m.itemVerification_askBoardLabel() }),
    );
    await waitFor(() => expect(router.invalidate).toHaveBeenCalled());
    expect(actions.requestReview).toHaveBeenCalledWith('experience:exp1');
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });

  it('asks the board when the API has no domain to email', async () => {
    const actions = emailActions({
      startEmailCheck: vi
        .fn()
        .mockResolvedValue({ ok: false, code: 'item_verification_no_domain' }),
    });
    await mount(<ItemVerificationTick item={emailItem} actions={actions} />);

    await openDialog();
    await sendCodeTo('ada@acme.com');
    expect(
      await screen.findByText(m.itemVerification_noEmailCheckBody()),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: m.itemVerification_askBoardLabel() }),
    );
    await waitFor(() =>
      expect(actions.requestReview).toHaveBeenCalledWith('experience:exp1'),
    );
  });

  it('says the board team has it on a conflict, without asking the board', async () => {
    const actions = emailActions({
      startEmailCheck: vi
        .fn()
        .mockResolvedValue({ ok: false, code: 'item_verification_conflict' }),
    });
    const router = await mount(
      <ItemVerificationTick item={emailItem} actions={actions} />,
    );

    await openDialog();
    await sendCodeTo('ada@acme.com');
    expect(
      await screen.findByText(m.itemVerification_conflictError()),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', {
        name: m.itemVerification_askBoardLabel(),
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(m.itemVerification_noEmailCheckBody()),
    ).not.toBeInTheDocument();
    await waitFor(() => expect(router.invalidate).toHaveBeenCalled());
  });

  it('moves to the board team when an edit removes the website mid-check', async () => {
    const actions = emailActions();
    function Harness() {
      const [item, setItem] = useState(emailItem);
      return (
        <>
          <button
            type="button"
            onClick={() => setItem({ ...emailItem, method: 'team' })}
          >
            edit
          </button>
          <ItemVerificationTick item={item} actions={actions} />
        </>
      );
    }
    await mount(<Harness />);

    await openDialog();
    await screen.findByLabelText(m.itemVerification_emailLabel());
    // The dialog is modal; the edit stands in for a save elsewhere.
    act(() => {
      screen.getByRole('button', { name: 'edit', hidden: true }).click();
    });
    expect(
      screen.queryByLabelText(m.itemVerification_emailLabel()),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: m.itemVerification_askBoardLabel() }),
    ).toBeInTheDocument();
  });
});

describe('ItemVerificationCard', () => {
  it('renders nothing when the board verifies no item', async () => {
    await mount(<ItemVerificationCard items={[]} />);
    expect(
      screen.queryByRole('heading', { name: m.itemVerification_heading() }),
    ).not.toBeInTheDocument();
  });

  it('puts a tick after each item', async () => {
    await mount(
      <ItemVerificationCard
        items={[emailItem]}
        actions={{ requestReview: vi.fn() }}
      />,
    );
    expect(
      screen.getByRole('button', { name: verifyName() }),
    ).toBeInTheDocument();
  });
});
