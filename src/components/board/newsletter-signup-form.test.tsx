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
  source = 'blog-index',
) {
  const view = render(
    <NewsletterSignupForm
      boardName={boardName}
      source={source}
      locale="de"
      onSubscribe={onSubscribe}
    />,
  );
  const input = screen.getByRole('textbox', { name: copy.emailLabel });
  fireEvent.change(input, { target: { value: 'reader@example.com' } });
  return { input, container: view.container };
}

const submit = () =>
  fireEvent.click(screen.getByRole('button', { name: copy.submitLabel }));

async function confirmation() {
  return (await screen.findByText(copy.submitted)).closest('[role="status"]');
}

describe('NewsletterSignupForm', () => {
  it('has no consent checkbox; the line under the field names the board and is sent as consentText', () => {
    const onSubscribe = vi.fn(() => new Promise<never>(() => {}));
    const { input } = renderForm(onSubscribe);

    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(copy.consentText).toContain(boardName);
    expect(input).toHaveAccessibleDescription(copy.consentText);
    submit();

    expect(onSubscribe).toHaveBeenCalledWith({
      email: 'reader@example.com',
      consent: true,
      consentText: copy.consentText,
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
    const { container } = renderForm(onSubscribe, 'footer');
    fireEvent.change(container.querySelector('input[name="website"]')!, {
      target: { value: 'https://spam.example' },
    });
    submit();

    expect(onSubscribe).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'footer',
        website: 'https://spam.example',
      }),
    );
  });

  it('replaces the form with the confirmation after sign-up', async () => {
    renderForm(
      vi.fn().mockResolvedValue({ status: 'submitted', sendingPaused: false }),
    );
    submit();

    const status = await confirmation();
    expect(status).not.toBeNull();
    expect(status).not.toHaveTextContent(copy.sendingPaused);
    expect(status).toHaveFocus();
    expect(screen.queryByRole('textbox', { name: copy.emailLabel })).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByText(copy.consentText)).toBeNull();
  });

  it('adds the delay note as its own line when the board has paused sending', async () => {
    renderForm(
      vi.fn().mockResolvedValue({ status: 'submitted', sendingPaused: true }),
    );
    submit();

    const status = await confirmation();
    expect(screen.getByText(copy.submitted)).toBeVisible();
    expect(status).toContainElement(screen.getByText(copy.sendingPaused));
    expect(screen.queryByRole('textbox', { name: copy.emailLabel })).toBeNull();
  });

  it('keeps the address and reports a failed request', async () => {
    const { input } = renderForm(vi.fn().mockRejectedValue(new Error('down')));
    submit();

    expect(await screen.findByRole('alert')).toHaveTextContent(copy.error);
    expect(input).toHaveValue('reader@example.com');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });
});
