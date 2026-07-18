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

/** The master list — scopes queries so a subject that also appears in the
 * detail metadata (the auto-selected email) isn't ambiguous. */
function list(): HTMLElement {
  return document.querySelector(
    '[data-test="preview-emails-list"]',
  ) as HTMLElement;
}

function detail(): HTMLElement {
  return document.querySelector(
    '[data-test="preview-email-detail"]',
  ) as HTMLElement;
}

/** The list/detail panes are portaled and populated after the async load — wait
 * for the container to mount before scoping queries into it. */
async function findList(): Promise<HTMLElement> {
  await waitFor(() => expect(list()).not.toBeNull());
  return list();
}

async function findDetail(): Promise<HTMLElement> {
  await waitFor(() => expect(detail()).not.toBeNull());
  return detail();
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

    // Both captures appear as compact rows in the master list, newest-first.
    await waitFor(() =>
      expect(
        within(list()).getByText('Your magic sign-in link'),
      ).toBeInTheDocument(),
    );
    const first = within(list()).getByText('Your magic sign-in link');
    const second = within(list()).getByText('Verify your email address');
    const rows = within(list()).getAllByRole('button');
    expect(rows).toHaveLength(2);
    // Newest-first order is preserved from the roster.
    expect(
      first.compareDocumentPosition(second) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    // Row shows recipient and the template type when present…
    expect(within(list()).getByText('nadia@example.com')).toBeInTheDocument();
    expect(within(list()).getByText('magic_link')).toBeInTheDocument();
    // …and hides the type badge entirely when the capture has no emailType.
    expect(within(list()).queryByText('verification')).toBeNull();
  });

  it('auto-selects the newest capture and frames its HTML body in a sandboxed iframe', async () => {
    mocks.listSandboxEmails.mockResolvedValue(emails);
    openPanel();

    // The newest email opens by default, so the detail metadata block names it.
    const pane = await findDetail();
    expect(within(pane).getByText('Subject')).toBeInTheDocument();
    expect(
      within(pane).getByText('Your magic sign-in link'),
    ).toBeInTheDocument();
    expect(within(pane).getByText('nadia@example.com')).toBeInTheDocument();

    // The body is isolated in a sandboxed iframe and the platform HTML is
    // handed to srcDoc verbatim (AGENTS.md rule 4: rendered as-is).
    const frame = within(pane).getByTitle('Email body') as HTMLIFrameElement;
    expect(frame.tagName).toBe('IFRAME');
    expect(frame).toHaveAttribute('sandbox', '');
    expect(frame.getAttribute('srcdoc')).toBe(emails[0]!.html);
  });

  it('shows the plain-text fallback when a selected email has no HTML body', async () => {
    mocks.listSandboxEmails.mockResolvedValue(emails);
    openPanel();

    // Select the HTML-less capture from the master list.
    const master = await findList();
    fireEvent.click(
      within(master).getByRole('button', { name: /Verify your/ }),
    );

    const pane = await findDetail();
    expect(await within(pane).findByText('Plain text')).toBeInTheDocument();
    expect(
      within(pane).getByText(/Verify: https:\/\/board\.test\/verify/),
    ).toBeInTheDocument();
    // No iframe is mounted for a plain-text-only capture.
    expect(within(pane).queryByTitle('Email body')).toBeNull();
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

    await waitFor(() =>
      expect(
        within(list()).getByText('Your magic sign-in link'),
      ).toBeInTheDocument(),
    );
  });
});
