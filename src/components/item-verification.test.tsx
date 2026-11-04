// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import type { ReactElement } from 'react';

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
  ItemVerificationControl,
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

function clickVerify() {
  fireEvent.click(
    screen.getByRole('button', {
      name: m.itemVerification_actionAriaLabel({ item: 'Acme' }),
    }),
  );
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

describe('ItemVerificationControl', () => {
  it('checks the work email in place: address, code, verified', async () => {
    const actions = {
      requestReview: vi.fn(),
      startEmailCheck: vi.fn().mockResolvedValue(sent()),
      confirmEmailCode: vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          code: 'item_verification_invalid_code',
        })
        .mockResolvedValueOnce({ ok: true, data: {} }),
    };
    const router = await mount(
      <ItemVerificationControl
        item={{ ...emailItem, emailDomain: 'acme.com' }}
        actions={actions}
      />,
    );

    clickVerify();
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
    expect(actions.requestReview).not.toHaveBeenCalled();
  });

  it('uses a full address as typed', async () => {
    const actions = {
      requestReview: vi.fn(),
      startEmailCheck: vi.fn().mockResolvedValue(sent()),
      confirmEmailCode: vi.fn(),
    };
    await mount(
      <ItemVerificationControl
        item={{ ...emailItem, emailDomain: 'acme.com' }}
        actions={actions}
      />,
    );

    clickVerify();
    await sendCodeTo('ada@eu.acme.com');
    await waitFor(() =>
      expect(actions.startEmailCheck).toHaveBeenCalledWith(
        'experience:exp1',
        'ada@eu.acme.com',
      ),
    );
  });

  it('says when the code expired and sends a new one', async () => {
    const actions = {
      requestReview: vi.fn(),
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
    };
    await mount(<ItemVerificationControl item={emailItem} actions={actions} />);

    clickVerify();
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

  it('closes the email check on cancel', async () => {
    const actions = {
      requestReview: vi.fn(),
      startEmailCheck: vi.fn(),
      confirmEmailCode: vi.fn(),
    };
    await mount(<ItemVerificationControl item={emailItem} actions={actions} />);

    clickVerify();
    await screen.findByLabelText(m.itemVerification_emailLabel());
    fireEvent.click(
      screen.getByRole('button', { name: m.itemVerification_cancelLabel() }),
    );
    expect(
      screen.queryByLabelText(m.itemVerification_emailLabel()),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: m.itemVerification_actionAriaLabel({ item: 'Acme' }),
      }),
    ).toBeInTheDocument();
  });

  it('asks the board to verify an item with no email check', async () => {
    const actions = {
      requestReview: vi.fn().mockResolvedValue({ ok: true, data: {} }),
    };
    const router = await mount(
      <ItemVerificationControl
        item={{ ...emailItem, method: 'team' }}
        actions={actions}
      />,
    );

    const button = screen.getByRole('button', {
      name: m.itemVerification_askBoardAriaLabel({ item: 'Acme' }),
    });
    expect(button).toHaveTextContent(m.itemVerification_askBoardLabel());
    fireEvent.click(button);
    await waitFor(() => expect(router.invalidate).toHaveBeenCalled());
    expect(actions.requestReview).toHaveBeenCalledWith('experience:exp1');
  });

  it.each(['rejected', 'needs_info'] as const)(
    'asks the board to verify a %s email-domain item',
    async (status) => {
      const actions = {
        requestReview: vi.fn().mockResolvedValue({ ok: true, data: {} }),
        startEmailCheck: vi.fn(),
        confirmEmailCode: vi.fn(),
      };
      const router = await mount(
        <ItemVerificationControl
          item={{ ...emailItem, verification: row(status) }}
          actions={actions}
        />,
      );

      fireEvent.click(
        screen.getByRole('button', {
          name: m.itemVerification_askBoardAriaLabel({ item: 'Acme' }),
        }),
      );
      await waitFor(() => expect(router.invalidate).toHaveBeenCalled());
      expect(actions.requestReview).toHaveBeenCalledWith('experience:exp1');
      expect(
        screen.queryByLabelText(m.itemVerification_emailLabel()),
      ).not.toBeInTheDocument();
    },
  );

  it('offers the board team when the item has no domain to email', async () => {
    const actions = {
      requestReview: vi.fn().mockResolvedValue({ ok: true, data: {} }),
      startEmailCheck: vi
        .fn()
        .mockResolvedValue({ ok: false, code: 'item_verification_no_domain' }),
      confirmEmailCode: vi.fn(),
    };
    const router = await mount(
      <ItemVerificationControl item={emailItem} actions={actions} />,
    );

    clickVerify();
    await sendCodeTo('ada@acme.com');

    expect(
      await screen.findByText(m.itemVerification_noEmailCheckBody()),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: m.itemVerification_askBoardLabel() }),
    );
    await waitFor(() => expect(router.invalidate).toHaveBeenCalled());
    expect(actions.requestReview).toHaveBeenCalledWith('experience:exp1');
    expect(
      screen.queryByText(m.itemVerification_noEmailCheckBody()),
    ).not.toBeInTheDocument();
  });

  it('shows a pending status without an action', async () => {
    await mount(
      <ItemVerificationControl
        item={{ ...emailItem, verification: row('pending') }}
        actions={{ requestReview: vi.fn() }}
      />,
    );
    expect(
      screen.getByText(m.itemVerification_pendingLabel()),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('ItemVerificationCard', () => {
  it('renders nothing when the board verifies no item', async () => {
    await mount(<ItemVerificationCard items={[]} />);
    expect(
      screen.queryByRole('heading', { name: m.itemVerification_heading() }),
    ).not.toBeInTheDocument();
  });
});
