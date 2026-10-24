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
