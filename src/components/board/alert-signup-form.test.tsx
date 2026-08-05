// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AlertSignupForm } from './alert-signup-form';

afterEach(cleanup);

describe('AlertSignupForm submission', () => {
  it('keeps the exact subscription payload visible as pending with an owned spinner', () => {
    const onSubscribe = vi.fn(
      () => new Promise<{ status: 'submitted' }>(() => {}),
    );
    const { container } = render(
      <AlertSignupForm
        language="en"
        filters={{ jobFunctions: ['Design'] }}
        context={{ source: 'jobs_list' }}
        onSubscribe={onSubscribe}
      />,
    );

    fireEvent.change(screen.getByRole('textbox', { name: 'email' }), {
      target: { value: 'designer@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'get job alerts' }));

    expect(onSubscribe).toHaveBeenCalledWith({
      email: 'designer@example.com',
      consent: true,
      frequency: 'weekly',
      filters: { jobFunctions: ['Design'] },
      context: { source: 'jobs_list' },
    });
    expect(
      screen.getByRole('button', { name: 'get job alerts' }),
    ).toBeDisabled();
    expect(
      container.querySelector("[data-slot='spinner']"),
    ).toBeInTheDocument();
    expect(screen.getByText('Subscribing…')).toBeVisible();
  });

  it('shows one uniform confirmation and clears the email after submission', async () => {
    render(
      <AlertSignupForm
        language="en"
        onSubscribe={vi.fn().mockResolvedValue({ status: 'submitted' })}
      />,
    );

    const input = screen.getByRole('textbox', { name: 'email' });
    fireEvent.change(input, { target: { value: 'person@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'get job alerts' }));

    expect(
      await screen.findByText(
        "If this email isn't already subscribed, we've sent a confirmation link — check your inbox.",
      ),
    ).toHaveAttribute('role', 'status');
    expect(input).toHaveValue('');
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.queryByText(/created|duplicate/i)).not.toBeInTheDocument();
  });

  it('announces a rejected subscription through the owned field error without clearing the email', async () => {
    render(
      <AlertSignupForm
        language="en"
        onSubscribe={vi.fn().mockRejectedValue(new Error('Unavailable'))}
      />,
    );

    const input = screen.getByRole('textbox', { name: 'email' });
    fireEvent.change(input, { target: { value: 'person@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'get job alerts' }));

    const error = await screen.findByRole('alert');
    expect(error).toHaveAttribute('data-slot', 'field-error');
    expect(error).toHaveTextContent('Something went wrong. Please try again.');
    expect(input).toHaveValue('person@example.com');
  });
});

const DECLARATION = {
  disclosureText: 'Email me occasional news from Acme Jobs.',
  privacyPolicyUrl: 'https://acme.example/privacy',
  disclosureVersion: 1,
};

async function subscribeWithConsent(options: {
  onOptIn: (email: string) => Promise<unknown>;
  declaration?: typeof DECLARATION | null;
  tickConsent: boolean;
}) {
  render(
    <AlertSignupForm
      language="en"
      onSubscribe={vi.fn().mockResolvedValue({ status: 'submitted' })}
      marketingConsent={{
        declaration:
          options.declaration === undefined ? DECLARATION : options.declaration,
        onOptIn: options.onOptIn,
      }}
    />,
  );

  fireEvent.change(screen.getByRole('textbox', { name: 'email' }), {
    target: { value: 'person@example.com' },
  });
  if (options.tickConsent) {
    fireEvent.click(screen.getByRole('checkbox'));
  }
  fireEvent.click(screen.getByRole('button', { name: 'get job alerts' }));
}

describe('AlertSignupForm newsletter consent (MKT-05)', () => {
  it('subscribes without opting in when the box is left unticked', async () => {
    const onOptIn = vi.fn().mockResolvedValue(undefined);
    await subscribeWithConsent({ onOptIn, tickConsent: false });

    expect(
      await screen.findByText(
        "If this email isn't already subscribed, we've sent a confirmation link — check your inbox.",
      ),
    ).toBeVisible();
    // Two separate decisions: subscribing to alerts is not marketing consent.
    expect(onOptIn).not.toHaveBeenCalled();
  });

  it('opts in with the same address once the box is ticked', async () => {
    const onOptIn = vi.fn().mockResolvedValue(undefined);
    await subscribeWithConsent({ onOptIn, tickConsent: true });

    expect(
      await screen.findByText(
        "If this email isn't already subscribed, we've sent a confirmation link — check your inbox.",
      ),
    ).toBeVisible();
    expect(onOptIn).toHaveBeenCalledWith('person@example.com');
  });

  it('still reports the alert as subscribed when the opt-in call fails', async () => {
    // The alert subscription already committed. Flipping the form to its error
    // state would tell the person their alert failed when it did not.
    const onOptIn = vi.fn().mockRejectedValue(new Error('opt-in unavailable'));
    await subscribeWithConsent({ onOptIn, tickConsent: true });

    expect(
      await screen.findByText(
        "If this email isn't already subscribed, we've sent a confirmation link — check your inbox.",
      ),
    ).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders no checkbox when the board has no active capture', async () => {
    const onOptIn = vi.fn();
    await subscribeWithConsent({
      onOptIn,
      declaration: null,
      tickConsent: false,
    });

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(onOptIn).not.toHaveBeenCalled();
  });
});
