// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PreviewEmail } from '../../lib/preview';

const mocks = vi.hoisted(() => ({
  listSandboxEmails: vi.fn<() => unknown>(),
}));

vi.mock('../../server/preview', () => ({
  listSandboxEmails: mocks.listSandboxEmails,
}));

import { PreviewEmailsSheet } from './preview-emails';

// Wire shape: `createdAt` is epoch ms; `text` and `type` are nullable — most
// captures carry an HTML body and no `emailType`.
const emails: PreviewEmail[] = [
  {
    id: 'email-magic',
    to: 'nadia@example.com',
    subject: 'Your magic sign-in link',
    html: '<p>Click <a href="https://board.test/magic?token=abc">here</a> to sign in.</p>',
    text: null,
    type: 'magic_link',
    createdAt: Date.parse('2026-07-17T11:59:00.000Z'),
  },
  {
    id: 'email-verify',
    to: 'adam@example.com',
    subject: 'Verify your email address',
    html: '',
    text: 'Verify: https://board.test/verify?token=def',
    type: null,
    createdAt: Date.parse('2026-07-17T10:00:00.000Z'),
  },
];

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function openPanel() {
  render(<PreviewEmailsSheet />);
  fireEvent.click(screen.getByRole('button', { name: 'Emails' }));
}

/** The per-row expand toggles: the only collapsed-expandable buttons on screen
 * (the sheet trigger is expanded while open; refresh/close carry no state). */
function rowToggles() {
  return screen.getAllByRole('button', { expanded: false });
}

describe('PreviewEmailsSheet', () => {
  it('lazily loads and renders captured emails newest-first on open', async () => {
    mocks.listSandboxEmails.mockResolvedValue(emails);
    openPanel();

    await waitFor(() =>
      expect(mocks.listSandboxEmails).toHaveBeenCalledWith({
        data: { limit: 50 },
      }),
    );

    const first = await screen.findByText('Your magic sign-in link');
    const second = screen.getByText('Verify your email address');
    expect(rowToggles()).toHaveLength(2);
    // Newest-first order is preserved from the roster.
    expect(
      first.compareDocumentPosition(second) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    // Row shows recipient and the template type when present…
    expect(screen.getByText(/nadia@example\.com/)).toBeInTheDocument();
    expect(screen.getByText('magic_link')).toBeInTheDocument();
    // …and hides the type badge entirely when the capture has no emailType.
    expect(screen.queryByText('verification')).toBeNull();
  });

  it('expands a row to show the rendered HTML body', async () => {
    mocks.listSandboxEmails.mockResolvedValue(emails);
    openPanel();

    fireEvent.click(await screen.findByRole('button', { name: /magic sign-in/ }));

    // The platform HTML is rendered as-is (the magic link is clickable).
    const link = await screen.findByRole('link', { name: 'here' });
    expect(link).toHaveAttribute('href', 'https://board.test/magic?token=abc');
  });

  it('falls back to plain text when an email has no HTML body', async () => {
    mocks.listSandboxEmails.mockResolvedValue(emails);
    openPanel();

    fireEvent.click(await screen.findByRole('button', { name: /Verify your/ }));

    expect(await screen.findByText('Plain text')).toBeInTheDocument();
    expect(
      screen.getByText(/Verify: https:\/\/board\.test\/verify/),
    ).toBeInTheDocument();
  });

  it('shows the empty state when nothing has been captured', async () => {
    mocks.listSandboxEmails.mockResolvedValue([]);
    openPanel();

    expect(
      await screen.findByText('No captured emails yet'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Your magic sign-in link')).toBeNull();
  });

  it('surfaces an error with a retry that refetches', async () => {
    mocks.listSandboxEmails.mockRejectedValueOnce(new Error('boom'));
    openPanel();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/Couldn't load captured emails/i);

    mocks.listSandboxEmails.mockResolvedValueOnce(emails);
    fireEvent.click(within(alert).getByRole('button', { name: 'Retry' }));

    expect(
      await screen.findByText('Your magic sign-in link'),
    ).toBeInTheDocument();
  });
});
