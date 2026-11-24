// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { localizePath } from '@/lib/localized-path';
import { m } from '@/paraglide/messages';
import { renderRouted } from '@/test/render-routed';

const mocks = {
  getOAuthAuthorizationUrl: vi.fn(),
  invalidate: vi.fn(),
  signUp: vi.fn(),
};

import { SignUpView } from './-auth.sign-up';
import { Route } from './auth.sign-up';

import {
  buildVerifyEmailRedirectPath,
  candidateOAuthReturnTo,
} from '@/lib/candidate-return-to';

afterEach(() => {
  // The HTML fallback must keep credentials and personal data out of GET URLs.
  for (const input of document.querySelectorAll<HTMLInputElement>(
    'input[type="password"], input[autocomplete="one-time-code"], input[type="email"], textarea[name="coverLetter"]',
  )) {
    expect(input.form?.method).toBe('post');
  }
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe('/auth/sign-up search contract', () => {
  it('validates a complete internal candidate destination', async () => {
    const validate = Route.options.validateSearch;
    if (!validate) {
      throw new Error('The candidate sign-up route must validate search');
    }
    if ('parse' in validate) {
      expect(
        validate.parse({
          returnTo: '/jobs?q=design&selectedJob=product-designer',
        }),
      ).toEqual({
        returnTo: '/jobs?q=design&selectedJob=product-designer',
      });
      return;
    }
    if ('~standard' in validate) {
      throw new Error('The candidate sign-up route uses an unexpected schema');
    }

    expect(
      validate({ returnTo: '/jobs?q=design&selectedJob=product-designer' }),
    ).toEqual({
      returnTo: '/jobs?q=design&selectedJob=product-designer',
    });
  });

  it('keeps a plausible ?email= for prefill and drops anything else', () => {
    const validate = Route.options.validateSearch;
    if (!validate || 'parse' in validate || '~standard' in validate) {
      throw new Error('The candidate sign-up route must validate search');
    }

    expect(
      validate({ returnTo: '/matches', email: '  ada@example.com ' }),
    ).toEqual({ returnTo: '/matches', email: 'ada@example.com' });
    expect(validate({ email: 'not-an-email' })).toEqual({});
    expect(validate({ email: `${'a'.repeat(310)}@example.com` })).toEqual({});
    expect(validate({ email: ['ada@example.com'] })).toEqual({});
  });

  it('pre-fills the email field without submitting', async () => {
    await renderRouted(
      <SignUpView
        boardName="Cavuno Jobs"
        returnTo="/matches"
        initialEmail="ada@example.com"
        signUpAction={mocks.signUp}
        getOAuthAuthorizationUrlAction={mocks.getOAuthAuthorizationUrl}
        invalidate={mocks.invalidate}
      />,
    );

    expect(screen.getByLabelText(m.authSignUp_emailLabel())).toHaveValue(
      'ada@example.com',
    );
    expect(mocks.signUp).not.toHaveBeenCalled();
  });

  it('offers the same Google and LinkedIn account entry points as sign-in', async () => {
    const returnTo = '/jobs?q=design';
    mocks.getOAuthAuthorizationUrl.mockResolvedValue({
      ok: false,
      message: 'OAuth unavailable in this test',
    });
    await renderRouted(
      <SignUpView
        boardName="Cavuno Jobs"
        returnTo={returnTo}
        signUpAction={mocks.signUp}
        getOAuthAuthorizationUrlAction={mocks.getOAuthAuthorizationUrl}
        invalidate={mocks.invalidate}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: m.authSignIn_continueWithGoogleLabel(),
      }),
    );
    await screen.findByRole('alert');
    fireEvent.click(
      screen.getByRole('button', {
        name: m.authSignIn_continueWithLinkedinLabel(),
      }),
    );

    expect(mocks.getOAuthAuthorizationUrl).toHaveBeenNthCalledWith(1, {
      data: {
        provider: 'google',
        returnTo: candidateOAuthReturnTo(returnTo, 'sign_up', 'google'),
      },
    });
    expect(mocks.getOAuthAuthorizationUrl).toHaveBeenNthCalledWith(2, {
      data: {
        provider: 'linkedin',
        returnTo: candidateOAuthReturnTo(returnTo, 'sign_up', 'linkedin'),
      },
    });
  });

  it('keeps verify-email conversion params on the post-registration fallback link', async () => {
    const returnTo = '/jobs?q=design&selectedJob=product-designer';
    mocks.signUp.mockResolvedValue({ ok: true });
    mocks.invalidate.mockRejectedValue(new Error('refresh unavailable'));
    await renderRouted(
      <SignUpView
        boardName="Cavuno Jobs"
        returnTo={returnTo}
        signUpAction={mocks.signUp}
        getOAuthAuthorizationUrlAction={mocks.getOAuthAuthorizationUrl}
        invalidate={mocks.invalidate}
      />,
    );
    fireEvent.change(screen.getByLabelText(m.authSignUp_nameLabel()), {
      target: { value: 'Ada Lovelace' },
    });
    fireEvent.change(screen.getByLabelText(m.authSignUp_emailLabel()), {
      target: { value: 'ada@example.com' },
    });
    fireEvent.change(screen.getByLabelText(m.authSignUp_passwordLabel()), {
      target: { value: 'correct-horse' },
    });
    fireEvent.click(
      screen.getByRole('button', {
        name: m.authSignUp_submitLabel(),
      }),
    );

    const action = await screen.findByRole('link', {
      name: m.authSignUp_goToAccountLabel(),
    });
    expect(action.getAttribute('href')).toBe(
      buildVerifyEmailRedirectPath(returnTo),
    );
    const url = new URL(action.getAttribute('href')!, 'https://board.example');
    expect(url.pathname).toBe(localizePath('/auth/verify-email-required'));
    expect(url.searchParams.get('returnTo')).toBe(localizePath(returnTo));
    expect(url.searchParams.get('cavuno_auth')).toBe('sign_up');
    expect(url.searchParams.get('cavuno_auth_method')).toBe('password');
  });

  it.each([
    [
      '/companies/acme/jobs/product-designer',
      '/companies/acme/jobs/product-designer',
    ],
    ['/account', undefined],
  ])(
    'carries the %s destination on the verification email link',
    async (returnTo, emailReturnTo) => {
      mocks.signUp.mockResolvedValue({ ok: true });
      mocks.invalidate.mockResolvedValue(undefined);
      await renderRouted(
        <SignUpView
          boardName="Cavuno Jobs"
          returnTo={returnTo}
          signUpAction={mocks.signUp}
          getOAuthAuthorizationUrlAction={mocks.getOAuthAuthorizationUrl}
          invalidate={mocks.invalidate}
        />,
      );
      fireEvent.change(screen.getByLabelText(m.authSignUp_nameLabel()), {
        target: { value: 'Ada Lovelace' },
      });
      fireEvent.change(screen.getByLabelText(m.authSignUp_emailLabel()), {
        target: { value: 'ada@example.com' },
      });
      fireEvent.change(screen.getByLabelText(m.authSignUp_passwordLabel()), {
        target: { value: 'correct-horse' },
      });
      fireEvent.click(
        screen.getByRole('button', { name: m.authSignUp_submitLabel() }),
      );

      await screen.findByRole('link', {
        name: m.authSignUp_goToAccountLabel(),
      });
      expect(mocks.signUp).toHaveBeenCalledTimes(1);
      const { data } = mocks.signUp.mock.calls[0]![0];
      expect(data.email).toBe('ada@example.com');
      if (emailReturnTo) {
        expect(data.returnTo).toBe(localizePath(emailReturnTo));
      } else {
        expect(data).not.toHaveProperty('returnTo');
      }
    },
  );
});

describe('/auth/sign-up mistyped email', () => {
  async function renderSignUp() {
    await renderRouted(
      <SignUpView
        boardName="Cavuno Jobs"
        returnTo="/account"
        signUpAction={mocks.signUp}
        getOAuthAuthorizationUrlAction={mocks.getOAuthAuthorizationUrl}
        invalidate={mocks.invalidate}
      />,
    );
    fireEvent.change(screen.getByLabelText(m.authSignUp_nameLabel()), {
      target: { value: 'Ada Lovelace' },
    });
    fireEvent.change(screen.getByLabelText(m.authSignUp_passwordLabel()), {
      target: { value: 'correct-horse' },
    });
    return screen.getByLabelText(m.authSignUp_emailLabel());
  }

  it('offers a likely correction on blur, and one tap takes it', async () => {
    const email = await renderSignUp();
    fireEvent.change(email, { target: { value: 'ada@hotmial.com' } });
    fireEvent.blur(email);
    expect(await screen.findByRole('status')).toHaveTextContent(
      m.product_emailSuggestionText({ email: 'ada@hotmail.com' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'ada@hotmail.com' }));

    expect(email).toHaveValue('ada@hotmail.com');
    expect(
      screen.queryByRole('button', { name: 'ada@hotmail.com' }),
    ).not.toBeInTheDocument();
  });

  it('shows a refused address under the email field, then signs up with the correction', async () => {
    const refusal = {
      ok: false,
      code: 'email_domain_undeliverable',
      message: 'This email address cannot receive mail.',
    };
    mocks.signUp
      .mockResolvedValueOnce(refusal)
      .mockResolvedValueOnce({ ...refusal, suggestion: 'ada@outlook.com' })
      .mockResolvedValueOnce({ ok: true });
    const email = await renderSignUp();
    const emailField = email.closest('[data-slot="field"]');
    // A domain the blur check leaves alone, so a correction can only be the
    // API's.
    fireEvent.change(email, { target: { value: 'ada@outlook.zz' } });
    const submit = screen.getByRole('button', {
      name: m.authSignUp_submitLabel(),
    });
    fireEvent.click(submit);

    const plain = await screen.findByRole('alert');
    expect(plain).toHaveTextContent(
      m.boardError_emailDomainUndeliverableText(),
    );
    // The email field's own error, not the form's under the password.
    expect(emailField).toContainElement(plain);
    expect(email).toHaveAttribute('aria-invalid', 'true');
    // Typing over the refused address takes the refusal away with it.
    fireEvent.change(email, { target: { value: 'ada@outlook.z' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(email).not.toHaveAttribute('aria-invalid');

    fireEvent.click(submit);
    const accept = await screen.findByRole('button', {
      name: 'ada@outlook.com',
    });
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getByRole('alert')).toHaveTextContent(
      m.boardError_emailDomainUndeliverableSuggestionText({
        domain: 'outlook.z',
        email: 'ada@outlook.com',
      }),
    );
    expect(emailField).toContainElement(screen.getByRole('alert'));
    fireEvent.click(accept);
    expect(email).toHaveValue('ada@outlook.com');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    fireEvent.click(submit);
    await screen.findByRole('link', { name: m.authSignUp_goToAccountLabel() });
    expect(mocks.signUp).toHaveBeenLastCalledWith({
      data: expect.objectContaining({ email: 'ada@outlook.com' }),
    });
  });
});
