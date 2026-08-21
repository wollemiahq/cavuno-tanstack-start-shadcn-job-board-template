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

vi.mock('../server/queries', () => ({ getSeoBase: vi.fn() }));

const mocks = vi.hoisted(() => ({
  confirmEmailChange: vi.fn(),
}));

vi.mock('../server/auth', () => ({
  confirmEmailChange: mocks.confirmEmailChange,
}));

import { Route } from './auth.confirm-email-change';

import { m } from '@/paraglide/messages';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe('/auth/confirm-email-change', () => {
  it('asks the visitor to request a new change when the token is missing', () => {
    vi.spyOn(Route, 'useSearch').mockReturnValue({ token: undefined });
    const Page = Route.options.component;
    if (!Page)
      throw new Error('The confirm-email-change route needs a component');

    render(<Page />);

    expect(
      screen.getByRole('heading', {
        name: m.authConfirmEmailChange_invalidTitle(),
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', {
        name: m.authConfirmEmailChange_backToSettingsLabel(),
      }),
    ).toHaveAttribute('href', '/settings');
  });

  it('confirms a valid token and links back to settings', async () => {
    vi.spyOn(Route, 'useSearch').mockReturnValue({ token: 'tok' });
    mocks.confirmEmailChange.mockResolvedValue({ ok: true });
    const Page = Route.options.component;
    if (!Page)
      throw new Error('The confirm-email-change route needs a component');

    render(<Page />);
    fireEvent.click(
      screen.getByRole('button', {
        name: m.authConfirmEmailChange_submitLabel(),
      }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole('heading', {
          name: m.authConfirmEmailChange_successTitle(),
        }),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole('link', {
        name: m.authConfirmEmailChange_backToSettingsLabel(),
      }),
    ).toHaveAttribute('href', '/settings');
    expect(mocks.confirmEmailChange).toHaveBeenCalledWith({
      data: { token: 'tok' },
    });
  });

  it('renders invalid_token and email_taken as distinct states', async () => {
    vi.spyOn(Route, 'useSearch').mockReturnValue({ token: 'tok' });
    mocks.confirmEmailChange.mockResolvedValue({
      ok: false,
      code: 'invalid_token',
      message: 'expired',
    });
    const Page = Route.options.component;
    if (!Page)
      throw new Error('The confirm-email-change route needs a component');

    render(<Page />);
    fireEvent.click(
      screen.getByRole('button', {
        name: m.authConfirmEmailChange_submitLabel(),
      }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      m.authConfirmEmailChange_invalidTokenBody(),
    );

    mocks.confirmEmailChange.mockResolvedValue({
      ok: false,
      code: 'email_taken',
      message: 'taken',
    });
    fireEvent.click(
      screen.getByRole('button', {
        name: m.authConfirmEmailChange_submitLabel(),
      }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      m.authConfirmEmailChange_emailTakenBody(),
    );
  });
});
