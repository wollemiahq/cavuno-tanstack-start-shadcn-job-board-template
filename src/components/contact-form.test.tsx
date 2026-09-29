// @vitest-environment jsdom

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
