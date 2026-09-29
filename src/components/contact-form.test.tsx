// @vitest-environment jsdom

import { renderToString } from 'react-dom/server';

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ContactForm } from './contact-form';

const submitContact = vi.fn();
const useRootSession = vi.fn();

// oxlint-disable-next-line anti-slop/no-module-mocking
vi.mock('../server/contact', () => ({
  submitContact: (...args: unknown[]) => submitContact(...args),
}));
// oxlint-disable-next-line anti-slop/no-module-mocking
vi.mock('./root-session', () => ({ useRootSession: () => useRootSession() }));

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  useRootSession.mockReturnValue({
    ready: true,
    user: { displayName: 'Ada Lovelace', email: 'ada@example.com' },
  });
});

describe('ContactForm', () => {
  it('does not allow a native submit before the form hydrates', () => {
    const html = renderToString(<ContactForm />);
    const document = new DOMParser().parseFromString(html, 'text/html');
    expect(document.querySelector('button[type="submit"]')?.textContent).toBe(
      'Loading form…',
    );
    for (const control of document.querySelectorAll(
      'input[name="name"], input[name="email"], textarea[name="body"], button[type="submit"]',
    )) {
      expect(control.hasAttribute('disabled')).toBe(true);
    }

    render(<ContactForm />);
    expect(screen.getByLabelText('Name').hasAttribute('disabled')).toBe(false);
    expect(screen.getByLabelText('Email').hasAttribute('disabled')).toBe(false);
    expect(screen.getByLabelText('Message').hasAttribute('disabled')).toBe(
      false,
    );
    expect(
      screen
        .getByRole('button', { name: 'Send message' })
        .hasAttribute('disabled'),
    ).toBe(false);
  });

  it('replaces the guest form with a persistent email confirmation', async () => {
    useRootSession.mockReturnValue({ ready: true, user: null });
    submitContact.mockResolvedValue({
      ok: true,
      data: { object: 'contact_submission', success: true },
    });
    const onSent = vi.fn();
    const view = render(<ContactForm onSent={onSent} />);
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Grace' },
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'grace@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Message'), {
      target: { value: 'Please help with my job alerts.' },
    });
    const form = screen
      .getByRole('button', { name: 'Send message' })
      .closest('form')!;
    fireEvent.submit(form);

    const status = await screen.findByRole('status');
    expect(status.textContent).toContain("We've received your message");
    expect(status.textContent).toContain('grace@example.com');
    expect(screen.queryByRole('button', { name: 'Send message' })).toBeNull();
    expect(onSent).toHaveBeenCalledOnce();
    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: "We've received your message" }),
      ).toBe(document.activeElement),
    );

    view.rerender(<ContactForm onSent={onSent} />);
    expect(screen.getByRole('status').textContent).toContain(
      'grace@example.com',
    );
  });

  it('prefills signed-in identity and preserves manual edits', async () => {
    const view = render(<ContactForm />);
    expect(
      // SAFETY: findByLabelText targets the rendered input with this label.
      ((await screen.findByLabelText('Name')) as HTMLInputElement).value,
    ).toBe('Ada Lovelace');
    // SAFETY: getByLabelText targets the rendered email input.
    expect((screen.getByLabelText('Email') as HTMLInputElement).value).toBe(
      'ada@example.com',
    );
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Grace' },
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'grace@example.com' },
    });
    view.rerender(<ContactForm />);
    // SAFETY: getByLabelText targets the rendered name input.
    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe(
      'Grace',
    );
    // SAFETY: getByLabelText targets the rendered email input.
    expect((screen.getByLabelText('Email') as HTMLInputElement).value).toBe(
      'grace@example.com',
    );
    expect(screen.queryByLabelText('Subject')).toBeNull();

    submitContact.mockResolvedValue({
      ok: true,
      data: { object: 'contact_submission', success: true },
    });
    fireEvent.change(screen.getByLabelText('Message'), {
      target: { value: 'Please help me.' },
    });
    fireEvent.submit(
      screen.getByRole('button', { name: 'Send message' }).closest('form')!,
    );
    expect((await screen.findByRole('status')).textContent).toContain(
      'grace@example.com',
    );
  });

  it('reuses the request id after a failed attempt', async () => {
    submitContact
      .mockResolvedValueOnce({ ok: false, message: 'Try again' })
      .mockResolvedValueOnce({
        ok: true,
        data: { object: 'contact_submission', success: true },
      });
    render(<ContactForm />);
    fireEvent.change(screen.getByLabelText('Message'), {
      target: { value: 'Hello' },
    });
    const form = screen
      .getByRole('button', { name: 'Send message' })
      .closest('form')!;
    fireEvent.submit(form);
    await screen.findByRole('alert');
    fireEvent.submit(form);
    await screen.findByRole('status');
    expect(submitContact).toHaveBeenCalledTimes(2);
    expect(submitContact.mock.calls[0][0].data.requestId).toBe(
      submitContact.mock.calls[1][0].data.requestId,
    );
    expect(submitContact.mock.calls[0][0].data).not.toHaveProperty('subject');
  });

  it('blocks duplicate submits while a request is pending', async () => {
    // oxlint-disable-next-line anti-slop/no-unknown-parameters
    let resolve!: (value: unknown) => void;
    submitContact.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    render(<ContactForm />);
    fireEvent.change(screen.getByLabelText('Message'), {
      target: { value: 'Hello' },
    });
    const form = screen
      .getByRole('button', { name: 'Send message' })
      .closest('form')!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(submitContact).toHaveBeenCalledTimes(1);
    resolve({
      ok: true,
      data: { object: 'contact_submission', success: true },
    });
    await waitFor(() => expect(screen.getByRole('status')).not.toBeNull());
  });
});
