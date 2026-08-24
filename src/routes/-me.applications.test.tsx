// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  isNotFound as isRouteNotFound,
} from '@tanstack/react-router';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ApplicationsPageView,
  createApplicationsLoader,
  type ApplicationsRouteDependencies,
} from './-me.applications';

import type { Application } from '@cavuno/board';

const dependencies: ApplicationsRouteDependencies = {
  getApplications: vi.fn(),
  getBoardContext: vi.fn(),
  getSeoBase: vi.fn(),
  withdrawApplication: vi.fn(),
};
const invalidate = vi.fn<() => Promise<void>>();

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
};

beforeEach(() => {
  vi.mocked(dependencies.getSeoBase).mockResolvedValue({
    boardName: 'Acme Board',
  });
  vi.mocked(dependencies.getBoardContext).mockResolvedValue({
    features: { nativeApplications: true },
  });
  vi.mocked(dependencies.getApplications).mockResolvedValue(
    applicationsEnvelope,
  );
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('candidate applications — native-applications gate', () => {
  it('loads the applications when native applications are on', async () => {
    const data = await createApplicationsLoader(dependencies)();

    expect(data).toMatchObject({ data: [application] });
    expect(dependencies.getApplications).toHaveBeenCalledOnce();
  });

  it('treats the route as not-found when native applications are off', async () => {
    vi.mocked(dependencies.getBoardContext).mockResolvedValue({
      features: { nativeApplications: false },
    });
    let outcome: unknown;
    try {
      await createApplicationsLoader(dependencies)();
    } catch (error) {
      outcome = error;
    }

    expect(isRouteNotFound(outcome)).toBe(true);
    // The 422-prone applications read is never attempted.
    expect(dependencies.getApplications).not.toHaveBeenCalled();
  });
});

describe('candidate applications', () => {
  it('uses the owned Item composition for each submitted application', async () => {
    const rootRoute = createRootRoute();
    const pageRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
      component: () => (
        <ApplicationsPageView
          applications={applicationsEnvelope}
          invalidate={invalidate}
          dependencies={dependencies}
        />
      ),
    });
    const router = createRouter({
      routeTree: rootRoute.addChildren([pageRoute]),
      history: createMemoryHistory({ initialEntries: ['/'] }),
    });
    render(<RouterProvider router={router} />);

    const item = (
      await screen.findByRole('link', { name: 'Senior Engineer' })
    ).closest('[data-slot="item"]');
    expect(item).not.toBeNull();
    expect(item?.querySelector('[data-slot="item-content"]')).not.toBeNull();
    expect(item?.querySelector('[data-slot="item-actions"]')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Withdraw' })).toBeEnabled();
  });
});
