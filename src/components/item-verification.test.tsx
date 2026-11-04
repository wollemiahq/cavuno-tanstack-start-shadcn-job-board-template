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
import { afterEach, describe, expect, it, vi } from 'vitest';

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

describe('ItemVerificationControl', () => {
  it('sends a code to the work email, then verifies with it', async () => {
    const actions = {
      requestReview: vi.fn(),
      startEmailCheck: vi.fn().mockResolvedValue({
        ok: true,
        data: { emailDomain: 'acme.com', sent: true },
      }),
      confirmEmailCode: vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          code: 'item_verification_invalid_code',
        })
        .mockResolvedValueOnce({ ok: true, data: {} }),
    };
    const router = await mount(
      <ItemVerificationControl item={emailItem} actions={actions} />,
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: m.itemVerification_actionAriaLabel({ item: 'Acme' }),
      }),
    );
    fireEvent.change(
      await screen.findByLabelText(m.itemVerification_emailLabel()),
      { target: { value: 'ada@acme.com' } },
    );
    fireEvent.click(
      screen.getByRole('button', { name: m.itemVerification_sendCodeLabel() }),
    );

    expect(
      await screen.findByText(
        m.itemVerification_codeIntro({ domain: 'acme.com' }),
      ),
    ).toBeInTheDocument();
    expect(actions.startEmailCheck).toHaveBeenCalledWith(
      'experience:exp1',
      'ada@acme.com',
    );

    const code = screen.getByLabelText(m.itemVerification_codeLabel());
    fireEvent.change(code, { target: { value: '123456' } });
    expect(
      await screen.findByText(m.itemVerification_codeInvalidError()),
    ).toBeInTheDocument();
    expect(actions.confirmEmailCode).toHaveBeenCalledTimes(1);

    fireEvent.click(
      screen.getByRole('button', { name: m.itemVerification_verifyLabel() }),
    );
    await waitFor(() => expect(router.invalidate).toHaveBeenCalled());
    expect(actions.confirmEmailCode).toHaveBeenLastCalledWith(
      'experience:exp1',
      '123456',
    );
    expect(actions.requestReview).not.toHaveBeenCalled();
  });

  it('asks the board team when the item has no email check', async () => {
    const actions = {
      requestReview: vi.fn().mockResolvedValue({ ok: true, data: {} }),
    };
    const router = await mount(
      <ItemVerificationControl
        item={{ ...emailItem, method: 'team' }}
        actions={actions}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: m.itemVerification_actionAriaLabel({ item: 'Acme' }),
      }),
    );
    await waitFor(() => expect(router.invalidate).toHaveBeenCalled());
    expect(actions.requestReview).toHaveBeenCalledWith('experience:exp1');
  });

  it.each(['rejected', 'needs_info'] as const)(
    'asks the board team for a %s email-domain item',
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
          name: m.itemVerification_actionAriaLabel({ item: 'Acme' }),
        }),
      );
      await waitFor(() => expect(router.invalidate).toHaveBeenCalled());
      expect(actions.requestReview).toHaveBeenCalledWith('experience:exp1');
      expect(
        screen.queryByLabelText(m.itemVerification_emailLabel()),
      ).not.toBeInTheDocument();
    },
  );

  it('offers team review when the item has no domain to email', async () => {
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

    fireEvent.click(
      screen.getByRole('button', {
        name: m.itemVerification_actionAriaLabel({ item: 'Acme' }),
      }),
    );
    fireEvent.change(
      await screen.findByLabelText(m.itemVerification_emailLabel()),
      { target: { value: 'ada@acme.com' } },
    );
    fireEvent.click(
      screen.getByRole('button', { name: m.itemVerification_sendCodeLabel() }),
    );

    expect(
      await screen.findByText(m.itemVerification_noEmailCheckBody()),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: m.itemVerification_requestLabel() }),
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
