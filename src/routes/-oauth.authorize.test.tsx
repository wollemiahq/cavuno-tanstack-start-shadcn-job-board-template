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

import { loadMcpConsent, McpConsentView } from './-oauth.authorize';

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
  heading: 'Assistant X would like access to your board account',
  trust: { label: 'Unverified application', description: 'Trust note.' },
  scopes: ['It can read your profile.', 'It can read your companies.'],
  redirectNotice: [
    'Authorizing will redirect you to ',
    { strong: 'x.test' },
    '.',
  ],
  email: 'ada@example.com',
};

function load(step: McpConsentStep, search = '?client_id=a&state=1e3') {
  const getMcpConsentStep = vi.fn().mockResolvedValue(step);
  const result = loadMcpConsent(search, {
    getMcpConsentStep,
    getSeoBase: async () => ({ boardName: 'Board' }),
  });
  return { result, getMcpConsentStep };
}

describe('/oauth/authorize loader', () => {
  it('asks the API with the query exactly as the assistant sent it', async () => {
    const { result, getMcpConsentStep } = load(consent);
    await expect(result).resolves.toMatchObject({ step: consent });
    expect(getMcpConsentStep).toHaveBeenCalledWith({
      data: { search: '?client_id=a&state=1e3' },
    });
  });

  it.each([
    ['sign_in', '/auth/sign-in'],
    ['verify_email', '/auth/verify-email-required'],
  ] as const)('sends %s to %s with the returned returnTo', async (next, to) => {
    const returnTo = '/oauth/authorize?request=abc&from=signed_in';
    const result = load({ next, returnTo }).result;
    await expect(result).rejects.toSatisfy(isRedirect);
    await expect(result).rejects.toMatchObject({
      options: { to, search: { returnTo } },
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

describe('/oauth/authorize view', () => {
  it('shows the request as text and allows it', async () => {
    const decide = vi.fn().mockResolvedValue({
      ok: true,
      data: { next: 'redirect', location: 'https://assistant.test/cb?code=c' },
    });
    const assignLocation = vi.fn();
    const { container } = render(
      <McpConsentView
        step={{ ...consent, scopes: [consent.clientName] }}
        decide={decide}
        assignLocation={assignLocation}
      />,
    );

    expect(
      screen.getByRole('heading', { name: consent.heading }),
    ).toBeInTheDocument();
    expect(screen.getByText(consent.clientName)).toBeInTheDocument();
    expect(container.querySelector('b')).toBeNull();
    expect(screen.getByText('x.test').tagName).toBe('STRONG');

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

  it('cancels, and shows the API’s reason when the decision fails', async () => {
    const decide = vi.fn().mockResolvedValue({
      ok: true,
      data: { next: 'error', message: 'This page expired.' },
    });
    const assignLocation = vi.fn();
    render(
      <McpConsentView
        step={consent}
        decide={decide}
        assignLocation={assignLocation}
      />,
    );

    const cancel = screen.getByRole('button', {
      name: m.mcpConsent_cancelLabel(),
    });
    fireEvent.click(cancel);
    expect(await screen.findByText('This page expired.')).toBeInTheDocument();
    expect(decide.mock.calls[0]?.[0].data.decision).toBe('deny');
    expect(assignLocation).not.toHaveBeenCalled();
    expect(cancel).toBeEnabled();
  });

  it('sends the browser on to an app-scheme callback', () => {
    const assignLocation = vi.fn();
    const location = 'cursor://anysphere.cursor-mcp/oauth/callback?code=c';
    render(
      <McpConsentView
        step={{ next: 'redirect', location }}
        decide={vi.fn()}
        assignLocation={assignLocation}
      />,
    );
    expect(assignLocation).toHaveBeenCalledWith(location);
    expect(
      screen.getByRole('link', { name: m.mcpConsent_returnLabel() }),
    ).toHaveAttribute('href', location);
  });

  it('shows the API’s error', () => {
    render(
      <McpConsentView
        step={{ next: 'error', message: 'Unknown assistant.' }}
        decide={vi.fn()}
        assignLocation={vi.fn()}
      />,
    );
    expect(
      screen.getByRole('heading', { name: m.mcpConsent_errorTitle() }),
    ).toBeInTheDocument();
    expect(screen.getByText('Unknown assistant.')).toBeInTheDocument();
  });
});
