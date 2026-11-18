// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { isRedirect } from '@tanstack/react-router';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadMcpConsent, McpConsentView } from './-authorize';

import { boardErrorMessage } from '@/lib/board-error-message';
import { localizePath } from '@/lib/localized-path';
import { m } from '@/paraglide/messages';
import type { McpConsentStep } from '@/server/mcp-consent';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const consent: Extract<McpConsentStep, { next: 'consent' }> = {
  next: 'consent',
  request: 'sealed-request',
  consentToken: 'token-1',
  clientName: '<b>Evil</b> Assistant',
  knownAssistant: null,
  email: 'ada@example.com',
  trustLevel: 'unverified',
  publisherHost: null,
  redirectHost: 'x.test',
  access: {
    candidate: null,
    employer: { reads: ['profiles', 'jobs'], changes: ['jobs'] },
  },
};

const BOARD = 'Acme Jobs';

function load(step: McpConsentStep, search = '?client_id=a&state=1e3') {
  const getMcpConsentStep = vi.fn().mockResolvedValue(step);
  const result = loadMcpConsent(search, {
    getMcpConsentStep,
    getSeoBase: async () => ({ boardName: 'Board' }),
  });
  return { result, getMcpConsentStep };
}

describe('/authorize loader', () => {
  it('asks the API with the page’s search', async () => {
    const { result, getMcpConsentStep } = load(consent);
    await expect(result).resolves.toMatchObject({ step: consent });
    expect(getMcpConsentStep).toHaveBeenCalledWith({
      data: { search: '?client_id=a&state=1e3' },
    });
  });

  it.each([
    ['sign_in', '/auth/sign-in'],
    ['verify_email', '/auth/verify-email-required'],
  ] as const)('sends %s to %s, to come back to this page', async (next, to) => {
    const returnTo = '/oauth/authorize?request=abc&from=signed_in';
    const result = load({ next, returnTo }).result;
    await expect(result).rejects.toSatisfy(isRedirect);
    await expect(result).rejects.toMatchObject({
      options: {
        to,
        search: {
          returnTo: `${localizePath('/authorize')}?request=abc&from=signed_in`,
        },
      },
    });
  });

  it('redirects to a web callback unchanged', async () => {
    const location = 'https://assistant.test/callback?code=c&state=s';
    await expect(load({ next: 'redirect', location }).result).rejects.toSatisfy(
      (error) => isRedirect(error) && error.options.href === location,
    );
  });

  it('renders an app-scheme callback instead of redirecting to it', async () => {
    const location = 'cursor://anysphere.cursor-mcp/oauth/callback?code=c';
    await expect(
      load({ next: 'redirect', location }).result,
    ).resolves.toMatchObject({ step: { next: 'redirect', location } });
  });
});

describe('/authorize view', () => {
  it('shows the request as text and allows it', async () => {
    const decide = vi.fn().mockResolvedValue({
      ok: true,
      data: { next: 'redirect', location: 'https://assistant.test/cb?code=c' },
    });
    const assignLocation = vi.fn();
    const { container } = render(
      <McpConsentView
        step={consent}
        boardName={BOARD}
        decide={decide}
        assignLocation={assignLocation}
      />,
    );

    expect(
      screen.getByRole('heading', {
        name: m.mcpConsent_heading({
          client: consent.clientName,
          board: BOARD,
        }),
      }),
    ).toBeInTheDocument();
    expect(container.querySelector('b')).toBeNull();
    expect(screen.getByText('x.test').tagName).toBe('STRONG');
    expect(
      screen.getByText(m.mcpConsent_trustUnverifiedText()),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: m.mcpConsent_allowLabel() }),
    );
    await waitFor(() =>
      expect(assignLocation).toHaveBeenCalledWith(
        'https://assistant.test/cb?code=c',
      ),
    );
    expect(decide).toHaveBeenCalledWith({
      data: {
        request: 'sealed-request',
        consentToken: 'token-1',
        decision: 'allow',
      },
    });
  });

  it('cancels, and shows the API’s answer in place of the choice', async () => {
    const decide = vi.fn().mockResolvedValue({
      ok: true,
      data: { next: 'error', code: 'expired', message: 'This page expired.' },
    });
    const assignLocation = vi.fn();
    render(
      <McpConsentView
        step={consent}
        boardName={BOARD}
        decide={decide}
        assignLocation={assignLocation}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: m.mcpConsent_cancelLabel() }),
    );
    expect(
      await screen.findByRole('heading', { name: m.mcpConsent_errorTitle() }),
    ).toBeInTheDocument();
    expect(screen.getByText(m.mcpConsent_errorExpired())).toBeInTheDocument();
    expect(decide.mock.calls[0]?.[0].data.decision).toBe('deny');
    expect(screen.queryByRole('button')).toBeNull();
    expect(assignLocation).not.toHaveBeenCalled();
  });

  it('keeps the choice when the call fails, so it can be tried again', async () => {
    const decide = vi.fn().mockResolvedValue({
      ok: false,
      code: 'rate_limited',
      message: 'Too many requests',
    });
    render(
      <McpConsentView
        step={consent}
        boardName={BOARD}
        decide={decide}
        assignLocation={vi.fn()}
      />,
    );

    const allow = screen.getByRole('button', {
      name: m.mcpConsent_allowLabel(),
    });
    fireEvent.click(allow);
    expect(
      await screen.findByText(m.boardError_rateLimitedText()),
    ).toBeInTheDocument();
    expect(allow).toBeEnabled();
  });

  it('sends the browser on to an app-scheme callback', () => {
    const assignLocation = vi.fn();
    const location = 'cursor://anysphere.cursor-mcp/oauth/callback?code=c';
    render(
      <McpConsentView
        step={{ next: 'redirect', location }}
        boardName={BOARD}
        decide={vi.fn()}
        assignLocation={assignLocation}
      />,
    );
    expect(assignLocation).toHaveBeenCalledWith(location);
    expect(
      screen.getByRole('link', { name: m.mcpConsent_returnLabel() }),
    ).toHaveAttribute('href', location);
  });

  it('never opens a callback that would run inside this site', () => {
    const assignLocation = vi.fn();
    render(
      <McpConsentView
        step={{ next: 'redirect', location: 'javascript:alert(1)' }}
        boardName={BOARD}
        decide={vi.fn()}
        assignLocation={assignLocation}
      />,
    );
    expect(assignLocation).not.toHaveBeenCalled();
    expect(
      screen.getByRole('heading', { name: m.mcpConsent_errorTitle() }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it.each([
    [
      { code: 'no_account', accountScopes: ['employer'] },
      m.mcpConsent_errorNoEmployerAccount({ board: BOARD }),
    ],
    [
      { code: 'not_signed_in' },
      m.mcpConsent_errorNotSignedIn({ board: BOARD }),
    ],
    // A code this site doesn't know yet: the site's unknown-error wording.
    [
      { code: 'something_new' },
      boardErrorMessage({ code: 'something_new', message: 'API wording.' }),
    ],
  ] as const)('words the error %o', (error, text) => {
    // SAFETY: a valid error step, except that `something_new` stands in for
    // a code a newer Board API may send.
    const step = {
      next: 'error',
      message: 'API wording.',
      ...error,
    } as Extract<McpConsentStep, { next: 'error' }>;
    render(
      <McpConsentView
        step={step}
        boardName={BOARD}
        decide={vi.fn()}
        assignLocation={vi.fn()}
      />,
    );
    expect(
      screen.getByRole('heading', { name: m.mcpConsent_errorTitle() }),
    ).toBeInTheDocument();
    expect(screen.getByText(text)).toBeInTheDocument();
  });
});
