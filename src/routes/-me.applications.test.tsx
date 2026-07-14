// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import type { ReactNode } from 'react';

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

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

vi.mock('../server/applications', () => ({
  getApplications: vi.fn<() => void>(),
  withdrawApplication: vi.fn<() => void>(),
}));

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

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
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
