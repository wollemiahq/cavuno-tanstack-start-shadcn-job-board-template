// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { isRedirect } from '@tanstack/react-router';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { handleEmployerLoaderErrorUsing } from '../lib/employer-loader-auth';

const mocks = {
  acceptCompanyInvite: vi.fn(),
  getSeoBase: vi.fn(),
  refreshSession: vi.fn(),
};

import { m } from '../paraglide/messages';
import {
  AcceptInviteView,
  loadAcceptInvite,
} from './-employers.invites.accept';
import { Route as AcceptInviteRoute } from './employers.invites.accept';

function inviteLocation() {
  const pathname = '/employers/invites/accept';
  return {
    href: `${pathname}?token=tok-1`,
    pathname,
    search: { token: 'tok-1' },
    searchStr: '?token=tok-1',
    state: { __TSR_index: 0 },
    hash: '',
    publicHref: `${pathname}?token=tok-1`,
    external: false,
  };
}

function runInviteLoader() {
  return loadAcceptInvite({ token: 'tok-1' }, inviteLocation(), {
    acceptCompanyInvite: mocks.acceptCompanyInvite,
    getSeoBase: mocks.getSeoBase,
    handleEmployerLoaderError: (error, returnTo, options) =>
      handleEmployerLoaderErrorUsing(
        mocks.refreshSession,
        error,
        returnTo,
        options,
      ),
  });
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

beforeEach(() => {
  mocks.getSeoBase.mockResolvedValue({
    boardName: 'Acme Board',
    language: 'en',
    origin: 'https://board.example',
  });
  mocks.refreshSession.mockResolvedValue({ ok: false });
});

describe('/employers/invites/accept', () => {
  it('owns the document main and is noindex', async () => {
    expect(AcceptInviteRoute.options.staticData).toMatchObject({
      ownsMain: true,
    });
    const head = AcceptInviteRoute.options.head;
    if (!head) throw new Error('needs a head');
    const match = {
      id: '/employers/invites/accept',
      routeId: '/employers/invites/accept',
      fullPath: '/employers/invites/accept',
      index: 1,
      pathname: '/employers/invites/accept',
      params: {},
      _strictParams: {},
      status: 'success',
      isFetching: false,
      error: null,
      paramsError: null,
      searchError: null,
      updatedAt: Date.now(),
      _nonReactive: {},
      context: { origin: 'https://board.example' },
      search: { token: 'tok-1' },
      _strictSearch: { token: 'tok-1' },
      fetchCount: 1,
      abortController: new AbortController(),
      cause: 'enter',
      loaderDeps: { token: 'tok-1' },
      preload: false,
      invalid: false,
      staticData: { ownsMain: true },
    } satisfies Parameters<typeof head>[0]['match'];
    const result = await head({
      loaderData: undefined,
      match,
      matches: [match],
      params: {},
    });
    expect(
      result.meta?.find((entry) => entry?.name === 'robots')?.content,
    ).toBe('noindex');
  });

  it('redirects signed-out visitors to sign-in with returnTo', async () => {
    mocks.acceptCompanyInvite.mockRejectedValue(new Error('UNAUTHENTICATED'));
    let result: unknown;
    try {
      result = await runInviteLoader();
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
    let result: unknown;
    try {
      result = await runInviteLoader();
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
    render(
      <AcceptInviteView
        state={{ mode: 'wrong-email', email: 'ada@acme.test' }}
      />,
    );

    expect(
      screen.getByText(
        m.employerInviteAccept_wrongEmailBody({ email: 'ada@acme.test' }),
      ),
    ).toBeInTheDocument();
  });

  it('shows the candidate-role and invalid-token states', () => {
    const { unmount } = render(
      <AcceptInviteView state={{ mode: 'candidate-role' }} />,
    );
    expect(
      screen.getByText(m.employerInviteAccept_candidateBody()),
    ).toBeInTheDocument();
    unmount();

    render(<AcceptInviteView state={{ mode: 'invalid' }} />);
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
    const result = await runInviteLoader();

    expect(result).toMatchObject({
      state: { mode: 'wrong-email', email: 'ada@acme.test' },
    });
  });
});
