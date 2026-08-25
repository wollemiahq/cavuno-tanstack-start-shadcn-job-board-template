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

import { rewritePreviewEmailLinks } from '../../lib/preview';

import type { PreviewEmail } from '../../lib/preview';
import type { LoadPreviewEmails } from './preview-emails';

const mocks = {
  listSandboxEmails: vi.fn<LoadPreviewEmails>(),
};

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
  render(<PreviewEmailsSheet loadEmails={mocks.listSandboxEmails} />);
  fireEvent.click(screen.getByRole('button', { name: 'Emails' }));
}

/** The master list — scopes queries so a subject that also appears in the
 * detail metadata (the auto-selected email) isn't ambiguous. */
function list(): HTMLElement {
  const element = document.querySelector<HTMLElement>(
    '[data-test="preview-emails-list"]',
  );
  if (!element) throw new Error('Expected the preview email list');
  return element;
}

function detail(): HTMLElement {
  const element = document.querySelector<HTMLElement>(
    '[data-test="preview-email-detail"]',
  );
  if (!element) throw new Error('Expected the preview email detail');
  return element;
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
      first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING,
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

    // The body remains isolated, but narrowly permits user-activated top-level
    // navigation so completion links can leave the mail pane.
    const frame = within(pane).getByTitle<HTMLIFrameElement>('Email body');
    expect(frame.tagName).toBe('IFRAME');
    expect(frame).toHaveAttribute(
      'sandbox',
      'allow-top-navigation-by-user-activation',
    );
    expect(frame.getAttribute('srcdoc')).toBe(emails[0]?.html);
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

  it('renders the server-retargeted verify link at the local origin, not the board', async () => {
    // The server fn (`listSandboxEmails`) rewrites board-origin links to the
    // frontend serving the viewer before the data crosses to the browser; here
    // we run that same transform on a board-origin capture, then pin that the
    // viewer frames the retargeted href verbatim.
    const captured: PreviewEmail = {
      id: 'email-verify-html',
      to: 'adam@example.com',
      subject: 'Verify your email address',
      html: '<p><a href="https://sandbox.cavuno.com/auth/verify-email?token=xyz">Verify</a></p>',
      text: null,
      type: 'verification',
      createdAt: Date.parse('2026-07-17T12:00:00.000Z'),
    };
    const retargeted = rewritePreviewEmailLinks(captured, {
      boardOrigin: 'https://sandbox.cavuno.com',
      appOrigin: 'http://[::1]:3030',
    });
    mocks.listSandboxEmails.mockResolvedValue([retargeted]);
    openPanel();

    const pane = await findDetail();
    const frame = within(pane).getByTitle<HTMLIFrameElement>('Email body');
    const srcdoc = frame.getAttribute('srcdoc') ?? '';
    // The link now opens in the running app, path/query preserved…
    expect(srcdoc).toContain(
      'href="http://[::1]:3030/auth/verify-email?token=xyz"',
    );
    expect(srcdoc).toContain('target="_top"');
    // …and no longer points at the hosted board.
    expect(srcdoc).not.toContain('https://sandbox.cavuno.com');
    // The narrow navigation token does not enable script execution or
    // same-origin DOM access.
    expect(frame.getAttribute('sandbox')).not.toContain('allow-scripts');
    expect(frame.getAttribute('sandbox')).not.toContain('allow-same-origin');
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
