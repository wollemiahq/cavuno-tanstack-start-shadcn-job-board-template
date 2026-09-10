// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EMPTY_GRANT } from '../server/talent-access';
import {
  EMPTY_ROOT_PREVIEW,
  RootSessionProvider,
  type RootSessionDependencies,
  useRootSession,
} from './root-session';

import type { BoardUser, CompanyMembership } from '@cavuno/board';

const verifiedUser = {
  id: 'user-1',
  object: 'board_user',
  role: 'employer',
  email: 'owner@acme.test',
  displayName: 'Ada Lovelace',
  emailVerified: true,
  hasPassword: true,
} satisfies BoardUser;

const membership = {
  id: 'membership-acme',
  object: 'company_membership',
  status: 'approved',
  role: 'owner',
  workEmail: 'owner@acme.test',
  workEmailVerifiedAt: '2026-07-14T00:00:00.000Z',
  company: {
    id: 'company-acme',
    name: 'Acme Ventures',
    slug: 'acme-ventures',
    website: 'acme.test',
    logoUrl: null,
  },
} satisfies CompanyMembership;

function Observer() {
  const session = useRootSession();
  return (
    <output data-testid="session">
      {JSON.stringify({
        userId: session.user?.id ?? null,
        companyIds: session.employerCompanies?.map(({ id }) => id) ?? null,
        ready: session.ready,
      })}
    </output>
  );
}

function createDependencies(
  overrides: Partial<RootSessionDependencies> = {},
): RootSessionDependencies {
  return {
    getSessionShell: vi.fn().mockResolvedValue({ user: null }),
    getEntitlements: vi.fn().mockResolvedValue({
      preview: EMPTY_ROOT_PREVIEW,
      hasGrant: false,
      talentAccess: EMPTY_GRANT,
    }),
    getCompanies: vi.fn().mockResolvedValue({ data: [] }),
    resolveHasAccessGrant: vi.fn().mockReturnValue(false),
    ...overrides,
  };
}

function renderSession(dependencies: RootSessionDependencies) {
  return render(
    <RootSessionProvider candidatePaywall dependencies={dependencies}>
      <Observer />
    </RootSessionProvider>,
  );
}

afterEach(cleanup);

describe('RootSessionProvider', () => {
  it('settles a guest shell without requesting employer companies', async () => {
    const dependencies = createDependencies();
    renderSession(dependencies);

    await waitFor(() =>
      expect(screen.getByTestId('session')).toHaveTextContent(
        '{"userId":null,"companyIds":null,"ready":true}',
      ),
    );
    expect(dependencies.getCompanies).not.toHaveBeenCalled();
    expect(dependencies.getEntitlements).toHaveBeenCalledOnce();
  });

  it.each([
    ['undefined', undefined],
    ['null', null],
  ])('fails closed when the shell resolves %s', async (_label, shell) => {
    const dependencies = createDependencies({
      getSessionShell: vi.fn().mockResolvedValue(shell),
    });
    renderSession(dependencies);

    await waitFor(() =>
      expect(screen.getByTestId('session')).toHaveTextContent(
        '{"userId":null,"companyIds":null,"ready":true}',
      ),
    );
    expect(dependencies.getCompanies).not.toHaveBeenCalled();
    expect(dependencies.getEntitlements).not.toHaveBeenCalled();
  });

  it('fails closed when the shell request rejects', async () => {
    const dependencies = createDependencies({
      getSessionShell: vi.fn().mockRejectedValue(new Error('unavailable')),
    });
    renderSession(dependencies);

    await waitFor(() =>
      expect(screen.getByTestId('session')).toHaveTextContent(
        '{"userId":null,"companyIds":null,"ready":true}',
      ),
    );
    expect(dependencies.getEntitlements).not.toHaveBeenCalled();
  });

  it('loads companies for a verified user', async () => {
    const dependencies = createDependencies({
      getSessionShell: vi.fn().mockResolvedValue({ user: verifiedUser }),
      getCompanies: vi.fn().mockResolvedValue({ data: [membership] }),
    });
    renderSession(dependencies);

    await waitFor(() =>
      expect(screen.getByTestId('session')).toHaveTextContent(
        '{"userId":"user-1","companyIds":["membership-acme"],"ready":true}',
      ),
    );
  });

  it('ignores a malformed company response', async () => {
    const dependencies = createDependencies({
      getSessionShell: vi.fn().mockResolvedValue({ user: verifiedUser }),
      getCompanies: vi.fn().mockResolvedValue(undefined),
    });
    renderSession(dependencies);

    await waitFor(() =>
      expect(screen.getByTestId('session')).toHaveTextContent(
        '{"userId":"user-1","companyIds":null,"ready":true}',
      ),
    );
  });

  it('does not load companies for an unverified user', async () => {
    const dependencies = createDependencies({
      getSessionShell: vi.fn().mockResolvedValue({
        user: { ...verifiedUser, emailVerified: false },
      }),
    });
    renderSession(dependencies);

    await waitFor(() =>
      expect(screen.getByTestId('session')).toHaveTextContent(
        '{"userId":"user-1","companyIds":null,"ready":true}',
      ),
    );
    expect(dependencies.getCompanies).not.toHaveBeenCalled();
  });

  it('stops the session chain after unmount', async () => {
    let resolveShell: ((value: { user: null }) => void) | undefined;
    const dependencies = createDependencies({
      getSessionShell: vi.fn().mockReturnValue(
        new Promise<{ user: null }>((resolve) => {
          resolveShell = resolve;
        }),
      ),
    });
    const view = renderSession(dependencies);

    view.unmount();
    await act(async () => resolveShell?.({ user: null }));

    expect(dependencies.getEntitlements).not.toHaveBeenCalled();
    expect(dependencies.getCompanies).not.toHaveBeenCalled();
  });
});
