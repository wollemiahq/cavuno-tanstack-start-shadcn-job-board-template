// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import {
  isRedirect,
  type AnyRedirect,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { handleEmployerLoaderErrorUsing } from '../lib/employer-loader-auth';
import { m } from '../paraglide/messages';
import { loadAcceptInvite } from './-employers.invites.accept';
import { Route as AcceptInviteRoute } from './employers.invites.accept';

import {
  InviteJoinView,
  type InviteJoinActions,
  type InviteJoinBoard,
  type InviteJoinState,
} from '@/components/employer/invite-join';
import type { CompanyMemberInvitePreview } from '@cavuno/board';

const mocks = {
  acceptCompanyInvite: vi.fn(),
  previewCompanyInvite: vi.fn(),
  getSessionUser: vi.fn(),
  getSeoBase: vi.fn(),
  refreshSession: vi.fn(),
};

const company = { slug: 'acme', name: 'Acme Robotics', logoUrl: null };
const board: InviteJoinBoard = {
  name: 'Robot Jobs',
  logoUrl: null,
  contactEnabled: true,
};

function pendingPreview(
  account: CompanyMemberInvitePreview['account'],
): CompanyMemberInvitePreview {
  return {
    object: 'company_member_invite_preview',
    status: 'pending',
    email: 'ada@acme.test',
    expiresAt: '2026-10-10T00:00:00.000Z',
    account,
    company,
  };
}

function closedPreview(
  status: 'expired' | 'accepted' | 'revoked',
): CompanyMemberInvitePreview {
  return {
    object: 'company_member_invite_preview',
    status,
    email: null,
    expiresAt: '2026-10-01T00:00:00.000Z',
    account: null,
    company,
  };
}

function inviteLocation(search: Record<string, string> = { token: 'tok-1' }) {
  const pathname = '/employers/invites/accept';
  const searchStr = `?${new URLSearchParams(search)}`;
  return {
    href: `${pathname}${searchStr}`,
    pathname,
    search,
    searchStr,
    state: { __TSR_index: 0 },
    hash: '',
    publicHref: `${pathname}${searchStr}`,
    external: false,
  };
}

function runInviteLoader(
  token = 'tok-1',
  location = inviteLocation({ token }),
) {
  return loadAcceptInvite({ token }, location, {
    acceptCompanyInvite: mocks.acceptCompanyInvite,
    previewCompanyInvite: mocks.previewCompanyInvite,
    getSessionUser: mocks.getSessionUser,
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

type LoaderOutcome =
  | Awaited<ReturnType<typeof runInviteLoader>>
  | Error
  | AnyRedirect;

async function settle(
  promise: ReturnType<typeof runInviteLoader>,
): Promise<LoaderOutcome> {
  try {
    return await promise;
  } catch (error) {
    if (isRedirect(error) || error instanceof Error) return error;
    throw error;
  }
}

afterEach(() => {
  // The HTML fallback must keep credentials out of GET URLs.
  for (const input of document.querySelectorAll<HTMLInputElement>(
    'input[type="password"], input[type="email"]',
  )) {
    expect(input.form?.method).toBe('post');
  }
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

describe('/employers/invites/accept loader', () => {
  it('is noindex', async () => {
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
      context: { origin: 'https://board.example' },
      search: { token: 'tok-1' },
      _strictSearch: { token: 'tok-1' },
      abortController: new AbortController(),
      cause: 'enter',
      loaderDeps: { token: 'tok-1' },
      preload: false,
      invalid: false,
      staticData: {},
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

  it.each([
    ['none', 'create-account'],
    ['employer', 'sign-in'],
    ['candidate', 'candidate'],
  ] as const)(
    'answers a signed-out visitor from the invite (account %s → %s) instead of bouncing to sign-in',
    async (account, mode) => {
      mocks.acceptCompanyInvite.mockRejectedValue(new Error('UNAUTHENTICATED'));
      mocks.previewCompanyInvite.mockResolvedValue(pendingPreview(account));

      const result = await settle(runInviteLoader());

      expect(isRedirect(result)).toBe(false);
      expect(mocks.previewCompanyInvite).toHaveBeenCalledWith({
        data: { token: 'tok-1' },
      });
      expect(result).toMatchObject({
        token: 'tok-1',
        state: { mode, company, email: 'ada@acme.test' },
      });
    },
  );

  it.each([
    ['expired', 'expired'],
    ['revoked', 'invalid'],
    ['accepted', 'invalid'],
  ] as const)(
    'explains a %s invite to a signed-out visitor',
    async (status, reason) => {
      mocks.acceptCompanyInvite.mockRejectedValue(new Error('UNAUTHENTICATED'));
      mocks.previewCompanyInvite.mockResolvedValue(closedPreview(status));

      expect(await runInviteLoader()).toMatchObject({
        state: { mode: 'unavailable', reason, company },
      });
    },
  );

  it('explains an unknown token without a company', async () => {
    mocks.acceptCompanyInvite.mockRejectedValue(new Error('UNAUTHENTICATED'));
    mocks.previewCompanyInvite.mockResolvedValue(null);

    expect(await runInviteLoader()).toMatchObject({
      state: { mode: 'unavailable', reason: 'invalid', company: null },
    });
  });

  it('explains a link without a token without calling the API', async () => {
    expect(await runInviteLoader('', inviteLocation({}))).toMatchObject({
      state: { mode: 'unavailable', reason: 'invalid', company: null },
    });
    expect(mocks.acceptCompanyInvite).not.toHaveBeenCalled();
    expect(mocks.previewCompanyInvite).not.toHaveBeenCalled();
  });

  it('retries a rejected but refreshable session instead of treating it as signed out', async () => {
    mocks.acceptCompanyInvite.mockRejectedValue(new Error('UNAUTHENTICATED'));
    mocks.refreshSession.mockResolvedValue({ ok: true });

    const result = await settle(runInviteLoader());

    expect(isRedirect(result)).toBe(true);
    if (!isRedirect(result)) return;
    expect(result.options.href).toBe(
      '/employers/invites/accept?token=tok-1&reauth=1',
    );
    expect(mocks.previewCompanyInvite).not.toHaveBeenCalled();
  });

  it('does not swallow failures that are not about the session', async () => {
    const outage = new Error('upstream unavailable');
    mocks.acceptCompanyInvite.mockRejectedValue(outage);

    expect(await settle(runInviteLoader())).toBe(outage);
    expect(mocks.previewCompanyInvite).not.toHaveBeenCalled();
  });

  it('opens the company workspace with the joined flag on success', async () => {
    mocks.acceptCompanyInvite.mockResolvedValue({
      ok: true,
      data: { object: 'company_member_invite_acceptance', companySlug: 'acme' },
    });

    const result = await settle(runInviteLoader());

    expect(mocks.acceptCompanyInvite).toHaveBeenCalledWith({
      data: { token: 'tok-1' },
    });
    expect(isRedirect(result)).toBe(true);
    if (!isRedirect(result)) return;
    expect(result.options.href).toBe('/employers/companies/acme?joined=1');
  });

  it('shows who is signed in when the invite is for another email', async () => {
    mocks.acceptCompanyInvite.mockResolvedValue({
      ok: false,
      code: 'invite_email_mismatch',
      message: 'mismatch',
      email: 'ada@acme.test',
    });
    mocks.previewCompanyInvite.mockResolvedValue(pendingPreview('employer'));
    mocks.getSessionUser.mockResolvedValue({
      email: 'grace@other.test',
      displayName: 'Grace',
    });

    expect(await runInviteLoader()).toMatchObject({
      state: {
        mode: 'wrong-account',
        company,
        email: 'ada@acme.test',
        signedInAs: { email: 'grace@other.test', displayName: 'Grace' },
      },
    });
  });

  it('flags a signed-in job seeker', async () => {
    mocks.acceptCompanyInvite.mockResolvedValue({
      ok: false,
      code: 'candidate_role',
      message: 'candidate',
    });
    mocks.previewCompanyInvite.mockResolvedValue(pendingPreview('candidate'));

    expect(await runInviteLoader()).toMatchObject({
      state: { mode: 'candidate', company, email: 'ada@acme.test' },
    });
  });

  it('treats a session the API rejects as signed out', async () => {
    mocks.acceptCompanyInvite.mockResolvedValue({
      ok: false,
      code: 'auth_unauthenticated',
      message: 'unauthenticated',
    });
    mocks.previewCompanyInvite.mockResolvedValue(pendingPreview('employer'));

    expect(await runInviteLoader()).toMatchObject({
      state: { mode: 'sign-in', company, email: 'ada@acme.test' },
    });
    expect(mocks.refreshSession).toHaveBeenCalledOnce();
  });

  it('reports a failed accept of a still-pending invite instead of calling it invalid', async () => {
    mocks.acceptCompanyInvite.mockResolvedValue({
      ok: false,
      code: 'rate_limited',
      message: 'Too many requests',
    });
    mocks.previewCompanyInvite.mockResolvedValue(pendingPreview('employer'));

    const result = await settle(runInviteLoader());

    expect(result).toBeInstanceOf(Error);
    expect(isRedirect(result)).toBe(false);
  });

  it('tells a signed-in visitor their invite expired', async () => {
    mocks.acceptCompanyInvite.mockResolvedValue({
      ok: false,
      code: 'invalid_token',
      message: 'invalid',
    });
    mocks.previewCompanyInvite.mockResolvedValue(closedPreview('expired'));

    expect(await runInviteLoader()).toMatchObject({
      state: { mode: 'unavailable', reason: 'expired', company },
    });
  });
});

function actionMocks() {
  return {
    signUp: vi.fn<InviteJoinActions['signUp']>(),
    signIn: vi.fn<InviteJoinActions['signIn']>(),
    requestMagicLink: vi.fn<InviteJoinActions['requestMagicLink']>(),
    getOAuthAuthorizationUrl:
      vi.fn<InviteJoinActions['getOAuthAuthorizationUrl']>(),
    acceptInvite: vi.fn<InviteJoinActions['acceptInvite']>(),
    signOut: vi.fn<InviteJoinActions['signOut']>(),
    assignLocation: vi.fn<InviteJoinActions['assignLocation']>(),
  } satisfies InviteJoinActions;
}

async function renderJoin(
  state: InviteJoinState,
  actions: InviteJoinActions,
  joinBoard: InviteJoinBoard = board,
) {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => (
      <InviteJoinView
        state={state}
        token="tok-1"
        board={joinBoard}
        actions={actions}
      />
    ),
  });
  const stubs = [
    '/auth/sign-in',
    '/auth/forgot-password',
    '/employers/dashboard',
    '/contact',
  ].map((path) =>
    createRoute({
      getParentRoute: () => rootRoute,
      path,
      component: () => null,
    }),
  );
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, ...stubs]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  await act(async () => {
    await router.load();
  });
  render(<RouterProvider router={router} />);
  await screen.findByRole('heading', { level: 1 });
}

function hrefSearch(link: HTMLElement) {
  const href = link.getAttribute('href') ?? '';
  return new URL(href, 'https://board.example');
}

describe('join page', () => {
  it('creates an account for the invited email, then joins the company', async () => {
    const actions = actionMocks();
    actions.signUp.mockResolvedValue({ ok: true });
    actions.acceptInvite.mockResolvedValue({
      ok: true,
      data: { companySlug: 'acme' },
    });
    await renderJoin(
      { mode: 'create-account', company, email: 'ada@acme.test' },
      actions,
    );

    expect(
      screen.getByRole('heading', {
        name: m.employerInviteJoin_joinTitle({ company: company.name }),
      }),
    ).toBeInTheDocument();
    const email = screen.getByLabelText(m.employerInviteJoin_emailLabel());
    expect(email).toHaveValue('ada@acme.test');
    expect(email).toHaveAttribute('readonly');
    expect(email).toHaveAccessibleDescription(
      m.employerInviteJoin_emailLockedHint(),
    );

    fireEvent.change(screen.getByLabelText(m.employerInviteJoin_nameLabel()), {
      target: { value: 'Ada Lovelace' },
    });
    fireEvent.change(
      screen.getByLabelText(m.employerInviteJoin_passwordLabel()),
      { target: { value: 'correct horse' } },
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: m.employerInviteJoin_createSubmitLabel(),
      }),
    );

    await waitFor(() => expect(actions.assignLocation).toHaveBeenCalled());
    expect(actions.signUp).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: 'ada@acme.test',
        password: 'correct horse',
        displayName: 'Ada Lovelace',
        inviteToken: 'tok-1',
      }),
    });
    expect(actions.acceptInvite).toHaveBeenCalledWith({
      data: { token: 'tok-1' },
    });
    expect(actions.signUp.mock.invocationCallOrder[0]).toBeLessThan(
      actions.acceptInvite.mock.invocationCallOrder[0]!,
    );
    const destination = new URL(
      actions.assignLocation.mock.calls[0]![0],
      'https://board.example',
    );
    expect(destination.pathname).toBe('/employers/companies/acme');
    expect(destination.searchParams.get('joined')).toBe('1');
  });

  it('reloads the invite page when joining fails after sign-up', async () => {
    const actions = actionMocks();
    actions.signUp.mockResolvedValue({ ok: true });
    actions.acceptInvite.mockResolvedValue({
      ok: false,
      code: 'invalid_token',
      message: 'invalid',
    });
    await renderJoin(
      { mode: 'create-account', company, email: 'ada@acme.test' },
      actions,
    );

    fireEvent.change(screen.getByLabelText(m.employerInviteJoin_nameLabel()), {
      target: { value: 'Ada' },
    });
    fireEvent.change(
      screen.getByLabelText(m.employerInviteJoin_passwordLabel()),
      { target: { value: 'correct horse' } },
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: m.employerInviteJoin_createSubmitLabel(),
      }),
    );

    await waitFor(() => expect(actions.assignLocation).toHaveBeenCalled());
    const destination = new URL(
      actions.assignLocation.mock.calls[0]![0],
      'https://board.example',
    );
    expect(destination.pathname).toBe('/employers/invites/accept');
    expect(destination.searchParams.get('token')).toBe('tok-1');
  });

  it('keeps the visitor on the form when registration is refused', async () => {
    const actions = actionMocks();
    actions.signUp.mockResolvedValue({
      ok: false,
      code: 'weak_password',
      message: 'Password too weak',
    });
    await renderJoin(
      { mode: 'create-account', company, email: 'ada@acme.test' },
      actions,
    );

    fireEvent.change(screen.getByLabelText(m.employerInviteJoin_nameLabel()), {
      target: { value: 'Ada' },
    });
    fireEvent.change(
      screen.getByLabelText(m.employerInviteJoin_passwordLabel()),
      { target: { value: 'correct horse' } },
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: m.employerInviteJoin_createSubmitLabel(),
      }),
    );

    await waitFor(() =>
      expect(
        screen.getByRole('button', {
          name: m.employerInviteJoin_createSubmitLabel(),
        }),
      ).toBeEnabled(),
    );
    expect(actions.acceptInvite).not.toHaveBeenCalled();
    expect(actions.assignLocation).not.toHaveBeenCalled();
  });

  it('starts social sign-up as an employer that returns to the invite', async () => {
    const actions = actionMocks();
    actions.getOAuthAuthorizationUrl.mockResolvedValue({
      ok: true,
      authorizeUrl: 'https://accounts.example/authorize',
    });
    await renderJoin(
      { mode: 'create-account', company, email: 'ada@acme.test' },
      actions,
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: m.authSignIn_continueWithGoogleLabel(),
      }),
    );

    await waitFor(() =>
      expect(actions.assignLocation).toHaveBeenCalledWith(
        'https://accounts.example/authorize',
      ),
    );
    const request = actions.getOAuthAuthorizationUrl.mock.calls[0]![0].data;
    expect(request).toMatchObject({ provider: 'google', role: 'employer' });
    const returnTo = new URL(request.returnTo, 'https://board.example');
    expect(returnTo.pathname).toBe('/employers/invites/accept');
    expect(returnTo.searchParams.get('token')).toBe('tok-1');
  });

  it('switches to sign-in for a visitor who already has an account', async () => {
    const actions = actionMocks();
    await renderJoin(
      { mode: 'create-account', company, email: 'ada@acme.test' },
      actions,
    );

    fireEvent.click(
      screen.getByRole('button', { name: m.employerInviteJoin_signInLink() }),
    );

    expect(
      await screen.findByRole('heading', {
        name: m.employerInviteJoin_signInTitle({ company: company.name }),
      }),
    ).toBeInTheDocument();
  });

  it('signs an existing employer in with the invited email, then joins', async () => {
    const actions = actionMocks();
    actions.signIn.mockResolvedValue({ ok: true });
    actions.acceptInvite.mockResolvedValue({
      ok: true,
      data: { companySlug: 'acme' },
    });
    await renderJoin(
      { mode: 'sign-in', company, email: 'ada@acme.test' },
      actions,
    );

    expect(
      screen.getByLabelText(m.employerInviteJoin_emailLabel()),
    ).toHaveValue('ada@acme.test');
    const forgot = screen.getByRole('link', {
      name: m.authSignIn_forgotPasswordLink(),
    });
    expect(hrefSearch(forgot).searchParams.get('returnTo')).toBe(
      '/employers/invites/accept?token=tok-1',
    );
    const otherAccount = screen.getByRole('link', {
      name: m.employerInviteJoin_differentAccountLink(),
    });
    expect(hrefSearch(otherAccount).pathname).toBe('/auth/sign-in');
    expect(hrefSearch(otherAccount).searchParams.get('returnTo')).toBe(
      '/employers/invites/accept?token=tok-1',
    );

    fireEvent.change(
      screen.getByLabelText(m.authSignIn_passwordLabel(), {
        selector: 'input[type="password"]',
      }),
      {
        target: { value: 'correct horse' },
      },
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: m.employerInviteJoin_signInSubmitLabel(),
      }),
    );

    await waitFor(() => expect(actions.assignLocation).toHaveBeenCalled());
    expect(actions.signIn).toHaveBeenCalledWith({
      data: { email: 'ada@acme.test', password: 'correct horse' },
    });
    expect(actions.acceptInvite).toHaveBeenCalledWith({
      data: { token: 'tok-1' },
    });
    expect(
      new URL(actions.assignLocation.mock.calls[0]![0], 'https://board.example')
        .pathname,
    ).toBe('/employers/companies/acme');
  });

  it('sends a magic link that returns to the invite', async () => {
    const actions = actionMocks();
    actions.requestMagicLink.mockResolvedValue({ ok: true });
    await renderJoin(
      { mode: 'sign-in', company, email: 'ada@acme.test' },
      actions,
    );

    fireEvent.click(
      screen.getByRole('radio', { name: m.authSignIn_magicLinkTabLabel() }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: m.authSignIn_sendMagicLinkLabel() }),
    );

    expect(
      await screen.findByRole('heading', {
        name: m.authSignIn_magicLinkSentTitle(),
      }),
    ).toBeInTheDocument();
    expect(actions.requestMagicLink).toHaveBeenCalledWith({
      data: {
        email: 'ada@acme.test',
        returnTo: '/employers/invites/accept?token=tok-1',
        intent: 'sign_in',
      },
    });
  });

  it('offers to sign out when someone else is signed in', async () => {
    const actions = actionMocks();
    actions.signOut.mockResolvedValue({ ok: true });
    await renderJoin(
      {
        mode: 'wrong-account',
        company,
        email: 'ada@acme.test',
        signedInAs: { email: 'grace@other.test', displayName: 'Grace' },
      },
      actions,
    );

    expect(screen.getByText('grace@other.test')).toBeInTheDocument();
    expect(
      screen.getByRole('link', {
        name: m.employerInviteJoin_keepSignedInLabel(),
      }),
    ).toHaveAttribute('href', '/employers/dashboard');

    fireEvent.click(
      screen.getByRole('button', {
        name: m.employerInviteJoin_signOutAndUseLabel({
          email: 'ada@acme.test',
        }),
      }),
    );

    await waitFor(() =>
      expect(actions.assignLocation).toHaveBeenCalledWith(
        '/employers/invites/accept?token=tok-1',
      ),
    );
    expect(actions.signOut).toHaveBeenCalledTimes(1);
  });

  it('explains an expired invite and links to the board contact page', async () => {
    await renderJoin(
      { mode: 'unavailable', reason: 'expired', company },
      actionMocks(),
    );

    expect(
      screen.getByRole('heading', {
        name: m.employerInviteJoin_expiredTitle(),
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', {
        name: m.employerInviteJoin_contactBoardLabel({ board: board.name }),
      }),
    ).toHaveAttribute('href', '/contact');
  });

  it('omits the contact link when the board has no contact page', async () => {
    await renderJoin(
      { mode: 'unavailable', reason: 'invalid', company: null },
      actionMocks(),
      { ...board, contactEnabled: false },
    );

    expect(
      screen.getByRole('heading', {
        name: m.employerInviteJoin_invalidTitle(),
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('tells a job seeker this invite needs another email', async () => {
    await renderJoin(
      { mode: 'candidate', company, email: 'ada@acme.test' },
      actionMocks(),
    );

    expect(
      screen.getByText(
        m.employerInviteJoin_candidateBody({
          email: 'ada@acme.test',
          board: board.name,
        }),
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).toBeNull();
  });
});
