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
  within,
} from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  ItemVerificationCard,
  type ItemVerificationActions,
  ItemVerificationTick,
} from './item-verification';

import type {
  ItemVerificationRow,
  VerifiableItem,
} from '@/board/item-verification';
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
  it.each([null, 'changed', 'needs_info'] as const)(
    'a %s item is a "Verify" badge',
    async (status) => {
      await mount(
        <ItemVerificationTick
          item={{ ...emailItem, verification: status ? row(status) : null }}
          actions={emailActions()}
        />,
      );
      expect(
        screen.getByRole('button', { name: verifyName() }),
      ).toHaveTextContent(m.itemVerification_verifyLabel());
    },
  );

  it('a verified item is a tick with a tooltip and nothing to open', async () => {
    await mount(
      <ItemVerificationTick
        item={{
          ...emailItem,
          verification: { ...row('verified'), verifiedDomain: 'acme.com' },
        }}
        actions={emailActions()}
      />,
    );
    const tick = screen.getByRole('img', {
      name: m.itemVerification_statusAriaLabel({
        status: m.itemVerification_verifiedWorkEmailTooltip(),
        item: 'Acme',
      }),
    });
    expect(tick.textContent).toBe('');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    fireEvent.click(tick);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('a team-verified item says Verified', async () => {
    await mount(
      <ItemVerificationTick
        item={{ ...emailItem, method: 'team', verification: row('verified') }}
        actions={emailActions()}
      />,
    );
    expect(
      screen.getByRole('img', {
        name: m.itemVerification_statusAriaLabel({
          status: m.itemVerification_verifiedLabel(),
          item: 'Acme',
        }),
      }),
    ).toBeInTheDocument();
  });

  it.each([
    [
      'pending',
      () => m.itemVerification_pendingLabel(),
      () => m.itemVerification_conflictError(),
    ],
    [
      'revoked',
      () => m.itemVerification_revokedLabel(),
      () => m.itemVerification_revokedLabel(),
    ],
    [
      'rejected',
      () => m.itemVerification_rejectedLabel(),
      () => m.itemVerification_rejectedLabel(),
    ],
  ] as const)(
    'a %s item names its status and opens it, with Close only',
    async (status, label, text) => {
      const actions = emailActions();
      await mount(
        <ItemVerificationTick
          item={{ ...emailItem, verification: row(status) }}
          actions={actions}
        />,
      );
      const tick = screen.getByRole('button', {
        name: m.itemVerification_statusAriaLabel({
          status: label(),
          item: 'Acme',
        }),
      });
      expect(tick.textContent).toBe(label());

      fireEvent.click(tick);
      const dialog = await screen.findByRole('dialog', { name: 'Acme' });
      expect(dialog).toHaveTextContent(text());
      expect(
        within(dialog)
          .getAllByRole('button')
          .every((button) => button.textContent === m.common_closeLabel()),
      ).toBe(true);
      expect(
        screen.queryByLabelText(m.itemVerification_emailLabel()),
      ).not.toBeInTheDocument();
      expect(actions.requestReview).not.toHaveBeenCalled();
    },
  );

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

    // The sent code refreshes the list, so a reopen resumes at the code.
    expect(router.invalidate).toHaveBeenCalledTimes(1);
    fireEvent.change(code, { target: { value: '654321' } });
    await waitFor(() => expect(router.invalidate).toHaveBeenCalledTimes(2));
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

  it('shows the status when the item becomes verified while open', async () => {
    const actions = emailActions();
    function Harness() {
      const [item, setItem] = useState<VerifiableItem>({
        ...emailItem,
        method: 'team',
      });
      return (
        <>
          <button
            type="button"
            onClick={() => setItem({ ...item, verification: row('verified') })}
          >
            refresh
          </button>
          <ItemVerificationTick item={item} actions={actions} />
        </>
      );
    }
    await mount(<Harness />);

    await openDialog();
    act(() => {
      screen.getByRole('button', { name: 'refresh', hidden: true }).click();
    });
    expect(
      screen.queryByRole('button', {
        name: m.itemVerification_askBoardLabel(),
      }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveTextContent(
      m.itemVerification_verifiedLabel(),
    );
  });
});

describe('the step the API says', () => {
  function next(
    status: ItemVerification['status'],
    nextStep: ItemVerificationRow['nextStep'],
    emailCheck: ItemVerificationRow['emailCheck'] = null,
  ): ItemVerificationRow {
    return { ...row(status), nextStep, emailCheck };
  }

  it('a nextStep decides whether the badge says "Verify"', async () => {
    await mount(
      <>
        <ItemVerificationTick
          item={{ ...emailItem, verification: next('needs_info', 'none') }}
          actions={emailActions()}
        />
        <ItemVerificationTick
          item={{
            ...emailItem,
            label: 'Globex',
            verification: next('rejected', 'team'),
          }}
          actions={emailActions()}
        />
      </>,
    );
    expect(
      screen.getByRole('button', {
        name: m.itemVerification_statusAriaLabel({
          status: m.itemVerification_needsInfoLabel(),
          item: 'Acme',
        }),
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: verifyName('Globex') }),
    ).toHaveTextContent(m.itemVerification_verifyLabel());
  });

  it('resumes an emailed code: resend asks for the address again', async () => {
    const actions = emailActions();
    await mount(
      <ItemVerificationTick
        item={{
          ...emailItem,
          emailDomain: 'acme.com',
          verification: next('unverified', 'email', {
            domain: 'acme.com',
            codeExpiresAt: new Date(Date.now() + 600_000).toISOString(),
            resendAvailableAt: new Date(Date.now() - 1000).toISOString(),
          }),
        }}
        actions={actions}
      />,
    );

    await openDialog();
    expect(
      screen.getByText(
        m.itemVerification_codeIntroDomain({ domain: 'acme.com' }),
        { exact: false },
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(m.itemVerification_codeLabel()),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: m.itemVerification_resendLabel() }),
    );
    expect(
      await screen.findByLabelText(m.itemVerification_emailLabel()),
    ).toBeInTheDocument();
    expect(actions.startEmailCheck).not.toHaveBeenCalled();
  });

  it('waits for the resend time the API gives', async () => {
    await mount(
      <ItemVerificationTick
        item={{
          ...emailItem,
          verification: next('unverified', 'email', {
            domain: 'acme.com',
            codeExpiresAt: new Date(Date.now() + 600_000).toISOString(),
            resendAvailableAt: new Date(Date.now() + 30_500).toISOString(),
          }),
        }}
        actions={emailActions()}
      />,
    );

    await openDialog();
    expect(
      screen.getByRole('button', {
        name: m.itemVerification_resendInLabel({ seconds: 31 }),
      }),
    ).toBeDisabled();
    fireEvent.click(
      screen.getByRole('button', {
        name: m.itemVerification_changeEmailLabel(),
      }),
    );
    expect(
      await screen.findByLabelText(m.itemVerification_emailLabel()),
    ).toBeInTheDocument();
  });

  it('goes straight to the board team when the API refuses email', async () => {
    await mount(
      <ItemVerificationTick
        item={{ ...emailItem, verification: next('changed', 'team') }}
        actions={emailActions()}
      />,
    );

    await openDialog();
    expect(
      screen.getByRole('button', { name: m.itemVerification_askBoardLabel() }),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText(m.itemVerification_emailLabel()),
    ).not.toBeInTheDocument();
  });

  it('asks for the email when the API allows it, whatever the status', async () => {
    await mount(
      <ItemVerificationTick
        item={{ ...emailItem, verification: next('needs_info', 'email') }}
        actions={emailActions()}
      />,
    );

    await openDialog();
    expect(
      await screen.findByLabelText(m.itemVerification_emailLabel()),
    ).toBeInTheDocument();
  });

  it('keeps a code sent from this page across close and reopen', async () => {
    const actions = emailActions();
    await mount(<ItemVerificationTick item={emailItem} actions={actions} />);

    await openDialog();
    await sendCodeTo('ada@acme.com');
    await screen.findByLabelText(m.itemVerification_codeLabel());
    fireEvent.click(
      screen.getByRole('button', { name: m.itemVerification_cancelLabel() }),
    );
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );

    await openDialog();
    expect(
      screen.getByText(
        m.itemVerification_codeIntro({ email: 'ada@acme.com' }),
        { exact: false },
      ),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', {
        name: m.itemVerification_changeEmailLabel(),
      }),
    );
    expect(
      await screen.findByLabelText(m.itemVerification_emailLabel()),
    ).toHaveValue('ada@acme.com');
  });
});

describe('ItemVerificationCard', () => {
  it('renders nothing when the board verifies no item', async () => {
    await mount(<ItemVerificationCard items={[]} />);
    expect(
      screen.queryByRole('heading', { name: m.itemVerification_heading() }),
    ).not.toBeInTheDocument();
  });

  it('puts an indicator on each item', async () => {
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
