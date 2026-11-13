// @vitest-environment jsdom
import { StrictMode } from 'react';

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthLinkConfirmation } from './auth-link-confirmation';

import { localizePath } from '@/lib/localized-path';
import { m } from '@/paraglide/messages';

afterEach(cleanup);

describe('sign-in confirmation', () => {
  it('exchanges only after confirmation, then leaves without another metadata read', async () => {
    const action = vi.fn().mockResolvedValue({ ok: true, isNewUser: false });
    const navigate = vi.fn();
    render(
      <AuthLinkConfirmation
        token="stored-auth-flow"
        returnTo="/account?cavuno_magic_binding=older-request"
        method="magic_link"
        action={action}
        navigate={navigate}
      />,
    );
    expect(action).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole('button', { name: m.authLinkConfirm_continueLabel() }),
    );
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith(
        '/account?cavuno_auth=login&cavuno_auth_method=magic_link',
      ),
    );
    expect(action).toHaveBeenCalledTimes(1);
    expect(action).toHaveBeenCalledWith({
      data: {
        token: 'stored-auth-flow',
        browserBinding: 'older-request',
        confirmed: true,
      },
    });
  });

  it.each([
    [
      'sends a returning employer to the employer dashboard',
      false,
      `${localizePath('/employers/dashboard')}?cavuno_auth=login`,
    ],
    [
      'keeps a new account on email verification',
      true,
      `${localizePath('/auth/verify-email-required')}?`,
    ],
  ] as const)('%s', async (_case, isNewUser, destinationStart) => {
    const action = vi.fn().mockResolvedValue({
      ok: true,
      isNewUser,
      boardUser: { role: 'employer' },
    });
    const navigate = vi.fn();
    render(
      <AuthLinkConfirmation
        token="stored-auth-flow"
        returnTo={`${localizePath('/account')}?cavuno_magic_binding=browser-proof`}
        method="magic_link"
        action={action}
        navigate={navigate}
        autoContinue
      />,
    );
    await waitFor(() => expect(navigate).toHaveBeenCalledOnce());
    const [destination] = navigate.mock.calls[0] ?? [];
    expect(String(destination).slice(0, destinationStart.length)).toBe(
      destinationStart,
    );
  });

  it.each([
    ['google', 'cavuno_oauth_binding'],
    ['magic_link', 'cavuno_magic_binding'],
  ] as const)(
    'automatically exchanges a browser-bound %s completion only once under StrictMode',
    async (method, bindingParam) => {
      const action = vi.fn().mockResolvedValue({ ok: true, isNewUser: false });
      const navigate = vi.fn();
      render(
        <StrictMode>
          <AuthLinkConfirmation
            token="stored-auth-flow"
            returnTo={`/account?${bindingParam}=browser-proof`}
            method={method}
            action={action}
            navigate={navigate}
            autoContinue
          />
        </StrictMode>,
      );
      await waitFor(() => expect(navigate).toHaveBeenCalledOnce());
      expect(action).toHaveBeenCalledOnce();
      expect(action).toHaveBeenCalledWith({
        data: {
          token: 'stored-auth-flow',
          browserBinding: 'browser-proof',
          confirmed: false,
        },
      });
      expect(navigate).toHaveBeenCalledWith(
        `/account?cavuno_auth=login&cavuno_auth_method=${method}`,
      );
    },
  );
});
