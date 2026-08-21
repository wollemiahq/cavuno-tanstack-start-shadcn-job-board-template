// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { isRedirect } from '@tanstack/react-router';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  acceptCompanyInvite: vi.fn(),
  getSeoBase: vi.fn(),
  refreshSession: vi.fn(),
}));

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@tanstack/react-router')>();
  const React = await import('react');

  return {
    ...actual,
    Link: ({
      children,
      to,
      search,
      ...props
    }: {
      children: React.ReactNode;
      to: string;
      search?: Record<string, string>;
    } & React.ComponentProps<'a'>) =>
      React.createElement(
        'a',
        {
          href:
            typeof search?.returnTo === 'string'
              ? `${to}?returnTo=${encodeURIComponent(search.returnTo)}`
              : to,
          ...props,
        },
        children,
      ),
  };
});

vi.mock('../server/employers', () => ({
  acceptCompanyInvite: mocks.acceptCompanyInvite,
}));

vi.mock('../server/auth', () => ({ refreshSession: mocks.refreshSession }));

vi.mock('../server/queries', () => ({ getSeoBase: mocks.getSeoBase }));

import { m } from '../paraglide/messages';
import { Route as AcceptInviteRoute } from './employers.invites.accept';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

beforeEach(() => {
  mocks.getSeoBase.mockResolvedValue({ boardName: 'Acme Board' });
  mocks.refreshSession.mockResolvedValue({ ok: false });
});

describe('/employers/invites/accept', () => {
  it('owns the document main and is noindex', () => {
    expect(AcceptInviteRoute.options.staticData).toMatchObject({
      ownsMain: true,
    });
    const head = AcceptInviteRoute.options.head;
    if (typeof head !== 'function') throw new Error('needs a head');
    const result = head({
      loaderData: undefined,
      match: { status: 'success' },
    } as never) as {
      meta?: Array<{ name?: string; content?: string }>;
    };
    expect(result.meta?.find((entry) => entry.name === 'robots')?.content).toBe(
      'noindex',
    );
  });

  it('redirects signed-out visitors to sign-in with returnTo', async () => {
    mocks.acceptCompanyInvite.mockRejectedValue(new Error('UNAUTHENTICATED'));
    const loader = AcceptInviteRoute.options.loader;
    if (typeof loader !== 'function') throw new Error('needs a loader');

    let result: unknown;
    try {
      result = await loader({
        deps: { token: 'tok-1' },
        location: { search: { token: 'tok-1' } },
      } as never);
    } catch (error) {
      result = error;
    }

    expect(isRedirect(result)).toBe(true);
    if (!isRedirect(result)) return;
    expect(result.options).toMatchObject({
      to: '/auth/sign-in',
      search: {
        returnTo: '/employers/invites/accept?token=tok-1',
      },
    });
  });

  it('navigates to the company members page on success', async () => {
    mocks.acceptCompanyInvite.mockResolvedValue({
      ok: true,
      data: { object: 'company_member_invite_acceptance', companySlug: 'acme' },
    });
    const loader = AcceptInviteRoute.options.loader;
    if (typeof loader !== 'function') throw new Error('needs a loader');

    let result: unknown;
    try {
      result = await loader({
        deps: { token: 'tok-1' },
        location: { search: { token: 'tok-1' } },
      } as never);
    } catch (error) {
      result = error;
    }

    expect(mocks.acceptCompanyInvite).toHaveBeenCalledWith({
      data: { token: 'tok-1' },
    });
    expect(isRedirect(result)).toBe(true);
    if (!isRedirect(result)) return;
    expect(result.options.href).toBe(
      '/employers/companies/acme/members?joined=1',
    );
  });

  it('shows the invite email when the signed-in address does not match', () => {
    vi.spyOn(AcceptInviteRoute, 'useLoaderData').mockReturnValue({
      seo: { boardName: 'Acme Board' },
      token: 'tok-1',
      state: { mode: 'wrong-email', email: 'ada@acme.test' },
    } as never);

    const Page = AcceptInviteRoute.options.component;
    if (!Page) throw new Error('needs a component');
    render(<Page />);

    expect(
      screen.getByText(
        m.employerInviteAccept_wrongEmailBody({ email: 'ada@acme.test' }),
      ),
    ).toBeInTheDocument();
  });

  it('shows the candidate-role and invalid-token states', () => {
    vi.spyOn(AcceptInviteRoute, 'useLoaderData').mockReturnValue({
      seo: { boardName: 'Acme Board' },
      token: 'tok-1',
      state: { mode: 'candidate-role' },
    } as never);

    const Page = AcceptInviteRoute.options.component;
    if (!Page) throw new Error('needs a component');
    const { unmount } = render(<Page />);
    expect(
      screen.getByText(m.employerInviteAccept_candidateBody()),
    ).toBeInTheDocument();
    unmount();

    vi.spyOn(AcceptInviteRoute, 'useLoaderData').mockReturnValue({
      seo: { boardName: 'Acme Board' },
      token: 'tok-1',
      state: { mode: 'invalid' },
    } as never);
    render(<Page />);
    expect(
      screen.getByText(m.employerInviteAccept_invalidBody()),
    ).toBeInTheDocument();
  });

  it('returns wrong-email state from invite_email_mismatch details', async () => {
    mocks.acceptCompanyInvite.mockResolvedValue({
      ok: false,
      code: 'invite_email_mismatch',
      message: 'mismatch',
      email: 'ada@acme.test',
    });
    const loader = AcceptInviteRoute.options.loader;
    if (typeof loader !== 'function') throw new Error('needs a loader');

    const result = await loader({
      deps: { token: 'tok-1' },
      location: { search: { token: 'tok-1' } },
    } as never);

    expect(result).toMatchObject({
      state: { mode: 'wrong-email', email: 'ada@acme.test' },
    });
  });
});
