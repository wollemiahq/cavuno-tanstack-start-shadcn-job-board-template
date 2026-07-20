// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import type { ReactNode } from 'react';

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Application } from '@cavuno/board';

const mocks = vi.hoisted(() => ({
  invalidate: vi.fn<() => void>(),
}));

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    getRouteApi: () => ({
      useLoaderData: () => ({
        board: { features: { candidatePaywall: false } },
        user: { displayName: 'Candidate', email: 'candidate@example.com' },
      }),
    }),
    Link: ({
      to,
      params,
      children,
      ...props
    }: {
      to: string;
      params?: Record<string, string>;
      children: ReactNode;
      className?: string;
    }) => (
      <a
        href={Object.entries(params ?? {}).reduce(
          (href, [key, value]) => href.replace(`$${key}`, value),
          to,
        )}
        {...props}
      >
        {children}
      </a>
    ),
    useRouter: () => ({ invalidate: mocks.invalidate }),
  };
});

const queryMocks = vi.hoisted(() => ({
  getSeoBase: vi.fn(),
  getBoardContext: vi.fn(),
}));
const applicationMocks = vi.hoisted(() => ({
  getApplications: vi.fn(),
  withdrawApplication: vi.fn(),
}));

// The route threads getSeoBase + getBoardContext through its loader (page
// title + the native-applications gate); both resolve cloudflare:workers, so
// stub the seam for jsdom.
vi.mock('../server/queries', () => ({
  getSeoBase: queryMocks.getSeoBase,
  getBoardContext: queryMocks.getBoardContext,
}));

vi.mock('../server/applications', () => ({
  getApplications: applicationMocks.getApplications,
  withdrawApplication: applicationMocks.withdrawApplication,
}));

import { isNotFound as isRouteNotFound } from '@tanstack/react-router';

import { Route } from './me.applications';

const application = {
  id: 'application-1',
  object: 'application',
  status: 'applied',
  appliedAt: '2026-07-14T00:00:00.000Z',
  updatedAt: '2026-07-14T00:00:00.000Z',
  coverNote: null,
  candidateName: 'Candidate',
  candidateEmail: 'candidate@example.com',
  candidateLocation: null,
  candidateHeadline: null,
  resumeFilename: null,
  job: {
    id: 'job-1',
    title: 'Senior Engineer',
    slug: 'senior-engineer',
    companySlug: 'acme',
    companyName: 'Acme',
  },
} satisfies Application;

const applicationsEnvelope = {
  object: 'list',
  url: '/v1/me/applications',
  data: [application],
  hasMore: false,
  nextCursor: null,
} as const;

beforeEach(() => {
  queryMocks.getSeoBase.mockResolvedValue({ boardName: 'Acme Board' });
  queryMocks.getBoardContext.mockResolvedValue({
    features: { nativeApplications: true, messaging: true },
  });
  applicationMocks.getApplications.mockResolvedValue(applicationsEnvelope);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe('candidate applications — native-applications gate', () => {
  it('loads the applications when native applications are on', async () => {
    const loader = Route.options.loader;
    if (typeof loader !== 'function')
      throw new Error('The applications route needs a loader');

    const data = await loader({} as never);

    expect(data).toMatchObject({ data: [application] });
    expect(applicationMocks.getApplications).toHaveBeenCalledOnce();
  });

  it('treats the route as not-found when native applications are off', async () => {
    queryMocks.getBoardContext.mockResolvedValue({
      features: { nativeApplications: false, messaging: true },
    });
    const loader = Route.options.loader;
    if (typeof loader !== 'function')
      throw new Error('The applications route needs a loader');

    let outcome: unknown;
    try {
      await loader({} as never);
    } catch (error) {
      outcome = error;
    }

    expect(isRouteNotFound(outcome)).toBe(true);
    // The 422-prone applications read is never attempted.
    expect(applicationMocks.getApplications).not.toHaveBeenCalled();
  });
});

describe('candidate applications', () => {
  it('uses the owned Item composition for each submitted application', () => {
    vi.spyOn(Route, 'useLoaderData').mockReturnValue({
      object: 'list',
      url: '/v1/me/applications',
      data: [application],
      hasMore: false,
      nextCursor: null,
    });
    const ApplicationsPage = Route.options.component;
    if (!ApplicationsPage)
      throw new Error('The applications route needs a component');

    render(<ApplicationsPage />);

    const item = screen
      .getByRole('link', { name: 'Senior Engineer' })
      .closest('[data-slot="item"]');
    expect(item).not.toBeNull();
    expect(item?.querySelector('[data-slot="item-content"]')).not.toBeNull();
    expect(item?.querySelector('[data-slot="item-actions"]')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Withdraw' })).toBeEnabled();
  });
});
