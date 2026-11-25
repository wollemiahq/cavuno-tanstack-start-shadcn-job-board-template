// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { NewsletterSignupForm } from './newsletter-signup-form';

import { newsletterCopy } from '@/copy-groups/newsletter';

const boardName = 'Northwind Careers';
const copy = newsletterCopy(boardName);

afterEach(cleanup);

function renderForm(
  onSubscribe: React.ComponentProps<typeof NewsletterSignupForm>['onSubscribe'],
) {
  render(
    <NewsletterSignupForm
      boardName={boardName}
      source="blog-index"
      locale="de"
      onSubscribe={onSubscribe}
    />,
  );
  const input = screen.getByRole('textbox', { name: copy.emailLabel });
  fireEvent.change(input, { target: { value: 'reader@example.com' } });
  return input;
}

const submit = () =>
  fireEvent.click(screen.getByRole('button', { name: copy.submitLabel }));
const tickConsent = () =>
  fireEvent.click(screen.getByRole('checkbox', { name: copy.consentLabel }));

describe('NewsletterSignupForm', () => {
  it('asks for consent and sends nothing while the box is unticked', () => {
    const onSubscribe = vi.fn();
    renderForm(onSubscribe);

    expect(
      screen.getByRole('checkbox', { name: copy.consentLabel }),
    ).not.toBeChecked();
    submit();

    expect(onSubscribe).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(copy.consentRequired);
    expect(
      screen.getByRole('checkbox', { name: copy.consentLabel }),
    ).toHaveAttribute('aria-invalid', 'true');
  });

  it('sends the consent wording naming the board, the form source, time zone, locale and honeypot', () => {
    const onSubscribe = vi.fn(() => new Promise<never>(() => {}));
    renderForm(onSubscribe);
    tickConsent();
    submit();

    expect(copy.consentLabel).toContain(boardName);
    expect(onSubscribe).toHaveBeenCalledWith({
      email: 'reader@example.com',
      consent: true,
      consentText: copy.consentLabel,
      source: 'blog-index',
      website: '',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      locale: 'de',
      pageUrl: window.location.href,
    });
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByRole('button')).toHaveTextContent(copy.subscribingLabel);
  });

  it('forwards a filled-in honeypot so the API can ignore the bot', () => {
    const onSubscribe = vi.fn(() => new Promise<never>(() => {}));
    const { container } = render(
      <NewsletterSignupForm
        boardName={boardName}
        source="blog-article"
        locale="en"
        onSubscribe={onSubscribe}
      />,
    );
    fireEvent.change(screen.getByRole('textbox', { name: copy.emailLabel }), {
      target: { value: 'bot@example.com' },
    });
    fireEvent.change(container.querySelector('input[name="website"]')!, {
      target: { value: 'https://spam.example' },
    });
    tickConsent();
    submit();

    expect(onSubscribe).toHaveBeenCalledWith(
      expect.objectContaining({ website: 'https://spam.example' }),
    );
  });

  it('shows the confirmation prompt and resets the form after sign-up', async () => {
    const input = renderForm(
      vi.fn().mockResolvedValue({ status: 'submitted', sendingPaused: false }),
    );
    tickConsent();
    submit();

    expect(await screen.findByText(copy.submitted)).toHaveAttribute(
      'role',
      'status',
    );
    expect(screen.queryByText(copy.sendingPaused, { exact: false })).toBeNull();
    expect(input).toHaveValue('');
    expect(
      screen.getByRole('checkbox', { name: copy.consentLabel }),
    ).not.toBeChecked();
  });

  it('adds a delay note when the board has paused sending', async () => {
    renderForm(
      vi.fn().mockResolvedValue({ status: 'submitted', sendingPaused: true }),
    );
    tickConsent();
    submit();

    const status = await screen.findByText(copy.submitted, { exact: false });
    expect(status).toHaveAttribute('role', 'status');
    expect(status).toHaveTextContent(copy.sendingPaused);
  });

  it('keeps the address and reports a failed request', async () => {
    const input = renderForm(vi.fn().mockRejectedValue(new Error('down')));
    tickConsent();
    submit();

    expect(await screen.findByRole('alert')).toHaveTextContent(copy.error);
    expect(input).toHaveValue('reader@example.com');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });
});
