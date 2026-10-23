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
        returnTo="/account"
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
        browserBinding: undefined,
        confirmed: true,
      },
    });
  });

  it('automatically exchanges a browser-bound completion only once under StrictMode', async () => {
    const action = vi.fn().mockResolvedValue({ ok: true, isNewUser: false });
    const navigate = vi.fn();
    render(
      <StrictMode>
        <AuthLinkConfirmation
          token="stored-auth-flow"
          returnTo="/account?cavuno_oauth_binding=browser-proof"
          method="google"
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
      '/account?cavuno_auth=login&cavuno_auth_method=google',
    );
  });
});
