// @vitest-environment jsdom
/**
 * JobCard stress invariants (CAV-485). The card was recomposed as an
 * Untitled UI card row; these lock the real-data behaviours that the
 * recomposition must preserve — the reasons the card exists, not its
 * markup: honest omission of absent salary/summary, the skill-tag cap
 * with an overflow count, the FEATURED pill shown ONLY for truly
 * featured jobs (no fake-featuring), and the title linking to the typed
 * job-detail route through the TanStack router seam.
 */
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { JobCard } from './job-card';

import type { JobCardVM } from '@/board/job-view-model';

afterEach(cleanup);

const baseVM: JobCardVM = {
  id: 'j1',
  title: 'Staff Platform Engineer',
  companySlug: null,
  jobSlug: null,
  detailHref: null,
  hasDetailLink: false,
  companyName: 'Acme',
  companyLogoUrl: null,
  companyAvatarName: 'Acme',
  sector: 'Engineering',
  compLine: '$120k–$160k · Remote',
  salaryLabel: '$120k–$160k',
  locationLabel: 'Worldwide (Remote)',
  summary: 'Own the deploy platform end to end.',
  isFeatured: false,
  featuredLabel: 'Featured',
  postedAtLabel: null,
  tags: [],
};

const tag = (name: string): JobCardVM['tags'][number] => ({
  key: `k-${name}`,
  name,
  href: `/jobs/skills/${name}`,
});

describe('JobCard stress invariants', () => {
  it('composes the owned shadcn Card surface', () => {
    render(<JobCard vm={baseVM} />);

    expect(
      screen.getByRole('article').querySelector('[data-slot="card"]'),
    ).not.toBeNull();
  });

  it('caps skill tags at 3 and shows an overflow count for the rest', () => {
    render(
      <JobCard
        vm={{
          ...baseVM,
          tags: ['React', 'Go', 'Kubernetes', 'Postgres', 'Rust'].map(tag),
        }}
      />,
    );
    expect(screen.getByText('React')).toBeTruthy();
    expect(screen.getByText('Go')).toBeTruthy();
    expect(screen.getByText('Kubernetes')).toBeTruthy();
    // The 4th and 5th collapse into a single honest overflow badge.
    expect(screen.queryByText('Postgres')).toBeNull();
    expect(screen.getByText('+2')).toBeTruthy();
  });

  it('shows no overflow badge when three or fewer tags', () => {
    render(<JobCard vm={{ ...baseVM, tags: ['React', 'Go'].map(tag) }} />);
    expect(screen.queryByText(/^\+\d+$/)).toBeNull();
  });

  it('omits the salary/location line when the VM has none', () => {
    const { rerender } = render(<JobCard vm={baseVM} />);
    expect(screen.getByText('$120k–$160k · Remote')).toBeTruthy();
    rerender(<JobCard vm={{ ...baseVM, compLine: null }} />);
    expect(screen.queryByText('$120k–$160k · Remote')).toBeNull();
  });

  it('omits the summary when the VM has none', () => {
    render(<JobCard vm={{ ...baseVM, summary: null }} />);
    expect(
      screen.queryByText('Own the deploy platform end to end.'),
    ).toBeNull();
  });

  it('shows the FEATURED pill only for genuinely featured jobs', () => {
    const { rerender } = render(<JobCard vm={baseVM} />);
    expect(screen.queryByText('Featured')).toBeNull();
    rerender(<JobCard vm={{ ...baseVM, isFeatured: true }} />);
    expect(screen.getByText('Featured')).toBeTruthy();
  });
});

describe('JobCard title link (URL contract)', () => {
  function renderInRouter(vm: JobCardVM) {
    const rootRoute = createRootRoute();
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
      component: () => <JobCard vm={vm} />,
    });
    const jobRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/companies/$companySlug/jobs/$jobSlug',
      component: () => <h1>Job detail</h1>,
    });
    const router = createRouter({
      routeTree: rootRoute.addChildren([indexRoute, jobRoute]),
      history: createMemoryHistory({ initialEntries: ['/'] }),
    });
    render(<RouterProvider router={router} />);
  }

  it('links the title to the typed job-detail route when slugs are present', async () => {
    renderInRouter({
      ...baseVM,
      companySlug: 'acme',
      jobSlug: 'staff-platform-engineer',
      detailHref: '/companies/acme/jobs/staff-platform-engineer',
      hasDetailLink: true,
    });
    const link = await screen.findByRole('link', {
      name: 'Staff Platform Engineer',
    });
    expect(link.getAttribute('href')).toBe(
      '/companies/acme/jobs/staff-platform-engineer',
    );
  });
});
