// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { useState } from 'react';

import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
/**
 * Auth routes submit native forms through FormData. Fields must therefore
 * render real inputs with the expected name, type, autocomplete, required,
 * and current-value semantics.
 */
import {
  cleanup,
  fireEvent,
  render as renderUi,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthCard, AuthDivider, Field, FormError } from './auth-form';
import { RegistrationPage, RoleSelector } from './registration-page';

async function render(node: React.ReactNode) {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <>{node}</>,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  await router.load();
  return renderUi(<RouterProvider router={router} />);
}

afterEach(cleanup);

describe('Field renders a native, form-participating input', () => {
  it('carries name/type/autoComplete and a native required attribute', async () => {
    const { container } = await render(
      <Field
        label="Email address"
        name="email"
        type="email"
        autoComplete="email"
      />,
    );
    const input = container.querySelector<HTMLInputElement>(
      'input[name="email"]',
    );
    expect(input).not.toBeNull();
    expect(input?.closest('[data-slot="field"]')).not.toBeNull();
    expect(screen.getByText('Email address')).toHaveAttribute(
      'data-slot',
      'field-label',
    );
    expect(input!.type).toBe('email');
    expect(input!.autocomplete).toBe('email');
    // The native `required` attribute — not merely aria-required — is what
    // makes the browser block an empty submit.
    expect(input!.hasAttribute('required')).toBe(true);
    // The visible label text is still rendered (accessible labelling).
    expect(screen.getByText('Email address')).toBeTruthy();
  });

  it('forwards minLength for the password rules', async () => {
    const { container } = await render(
      <Field label="Password" name="password" type="password" minLength={8} />,
    );
    const input = container.querySelector<HTMLInputElement>(
      'input[name="password"]',
    );
    expect(input!.minLength).toBe(8);
  });

  it('a plain form reads the typed value through FormData (submit contract)', async () => {
    const seen: Record<string, string> = {};
    const { container } = await render(
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          seen.email = String(data.get('email'));
        }}
      >
        <Field label="Email address" name="email" type="email" />
        <button type="submit">Submit</button>
      </form>,
    );
    const input = container.querySelector<HTMLInputElement>(
      'input[name="email"]',
    )!;
    fireEvent.change(input, { target: { value: 'candidate@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(seen.email).toBe('candidate@example.com');
  });
});

describe('AuthCard + FormError chrome', () => {
  it('renders the card title as a heading', async () => {
    await render(
      <AuthCard title="Sign in">
        <p>body</p>
      </AuthCard>,
    );
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeTruthy();
  });

  it('FormError shows a message only when one is present', async () => {
    const { rerender, container } = await render(<FormError message={null} />);
    expect(container.textContent).toBe('');
    rerender(<FormError message="Invalid credentials" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid credentials');
    expect(screen.getByRole('alert')).toHaveAttribute(
      'data-slot',
      'field-error',
    );
  });

  it('uses the form separator anatomy for the auth divider', async () => {
    const { container } = await render(<AuthDivider label="Or" />);

    expect(
      container.querySelector('[data-slot="field-separator"]'),
    ).toHaveTextContent('Or');
  });
});

describe('RegistrationPage', () => {
  const copy = {
    nameLabel: 'Name',
    emailLabel: 'Email',
    passwordLabel: 'Password',
    submitLabel: 'Create account',
    pendingLabel: 'Creating account…',
    successTitle: 'Check your email',
    successText: 'Open the verification link to continue.',
    successActionLabel: 'Go to my account',
  };

  it('reports a registration error without losing the submitted values', async () => {
    await render(
      <RegistrationPage
        title="Create your account"
        supportingText="Join the board."
        copy={copy}
        successHref="/account"
        onSubmit={async () => ({
          ok: false,
          // Wire message is English API text; the UI must resolve the CODE
          // through the catalog and never echo the wire sentence.
          code: 'board_auth_email_taken',
          message: 'Email is already registered',
        })}
      />,
    );

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Alex Morgan' },
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'alex@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'correct-horse' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'An account with that email already exists.',
    );
    expect(screen.getByLabelText('Email')).toHaveValue('alex@example.com');
  });

  it('surfaces an unmapped failure code instead of a bare generic line', async () => {
    await render(
      <RegistrationPage
        title="Create your account"
        supportingText="Join the board."
        copy={copy}
        successHref="/account"
        onSubmit={async () => ({
          ok: false,
          code: 'preview_mode_write_forbidden',
          message: 'Preview writes are disabled',
        })}
      />,
    );

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Alex Morgan' },
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'alex@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'correct-horse' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Something went wrong. Please try again. (preview_mode_write_forbidden)',
    );
    expect(await screen.findByRole('alert')).not.toHaveTextContent(
      'Preview writes are disabled',
    );
  });

  it('recovers when the registration request rejects unexpectedly', async () => {
    await render(
      <RegistrationPage
        title="Create your account"
        supportingText="Join the board."
        copy={copy}
        successHref="/account"
        onSubmit={async () => {
          throw new Error('network unavailable');
        }}
      />,
    );

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Alex Morgan' },
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'alex@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'correct-horse' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Something went wrong. Try again.',
    );
    expect(
      screen.getByRole('button', { name: 'Create account' }),
    ).toBeEnabled();
  });

  it('replaces the initial heading with one announced success heading', async () => {
    await render(
      <RegistrationPage
        title="Create your account"
        supportingText="Join the board."
        copy={copy}
        successHref="/account"
        onSubmit={async () => ({ ok: true })}
      />,
    );

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Alex Morgan' },
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'alex@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'correct-horse' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent('Check your email');
    expect(
      screen.queryByRole('heading', { name: 'Create your account' }),
    ).toBeNull();
    expect(screen.getAllByRole('heading')).toHaveLength(1);
    expect(
      screen.getByRole('heading', { name: 'Check your email' }),
    ).toBeInTheDocument();
  });

  it('auto-redirects to successHref after registration succeeds', async () => {
    const assign = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { assign },
    });
    await render(
      <RegistrationPage
        title="Create your account"
        supportingText="Join the board."
        copy={copy}
        successHref="/auth/verify-email-required?cavuno_auth=sign_up"
        onSubmit={async () => ({ ok: true })}
      />,
    );

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Alex Morgan' },
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'alex@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'correct-horse' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() =>
      expect(assign).toHaveBeenCalledWith(
        '/auth/verify-email-required?cavuno_auth=sign_up',
      ),
    );
  });

  it('keeps the pending Base UI submit in the tab order', async () => {
    await render(
      <RegistrationPage
        title="Create your account"
        supportingText="Join the board."
        copy={copy}
        successHref="/account"
        onSubmit={() => new Promise(() => undefined)}
      />,
    );

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Alex Morgan' },
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'alex@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'correct-horse' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    const pending = await screen.findByRole('button', {
      name: 'Creating account…',
    });
    expect(pending).toHaveAttribute('aria-disabled', 'true');
    expect(pending).not.toHaveAttribute('disabled');
    expect(pending).toHaveAttribute('tabindex', '0');
  });
});

describe('RoleSelector', () => {
  it('moves selection between the candidate and employer choices', async () => {
    function Harness() {
      const [value, setValue] = useState<'candidate' | 'employer'>('candidate');
      return (
        <RoleSelector
          value={value}
          onValueChange={setValue}
          ariaLabel="How would you like to get started?"
          candidateTitle="I'm looking for a job"
          candidateBody="Get matched with jobs for free"
          employerTitle="I'm hiring"
          employerBody="Post jobs and reach candidates"
        />
      );
    }

    await render(<Harness />);
    const candidate = screen.getByRole('radio', {
      name: /I'm looking for a job/,
    });
    const employer = screen.getByRole('radio', { name: /I'm hiring/ });

    expect(candidate).toBeChecked();
    expect(candidate).toHaveAttribute(
      'aria-label',
      "I'm looking for a job. Get matched with jobs for free",
    );
    expect(candidate.closest('[data-slot="field"]')).not.toBeNull();
    expect(candidate.closest('[data-slot="field-label"]')).not.toBeNull();
    expect(screen.getByText('Get matched with jobs for free')).toHaveAttribute(
      'data-slot',
      'field-description',
    );
    fireEvent.click(screen.getByText("I'm hiring"));
    expect(employer).toBeChecked();
  });
});
