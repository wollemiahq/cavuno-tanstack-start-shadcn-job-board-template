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
  companyName: 'Acme',
  companyLogoUrl: null,
  companyAvatarName: 'Acme',
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

  it('renders location and salary as separate lines like the workspace card, omitting salary when absent', () => {
    const { rerender } = render(<JobCard vm={baseVM} />);
    // Location uses the workspace string ("Worldwide (Remote)"), NOT the old
    // combined "$… · Remote" compLine.
    expect(screen.getByText('Worldwide (Remote)')).toBeTruthy();
    expect(screen.getByText('$120k–$160k')).toBeTruthy();
    expect(screen.queryByText('$120k–$160k · Remote')).toBeNull();
    // Salary omitted when the VM has none; location still shows.
    rerender(<JobCard vm={{ ...baseVM, salaryLabel: null }} />);
    expect(screen.queryByText('$120k–$160k')).toBeNull();
    expect(screen.getByText('Worldwide (Remote)')).toBeTruthy();
  });

  it('orders the tile like the workspace result card: title → company → location → salary → description', () => {
    const { container } = render(
      <JobCard
        vm={{ ...baseVM, postedAtLabel: '2d ago' }}
        linkTo="detail"
      />,
    );
    const text = (container.textContent ?? '').replace(/\s+/g, ' ');
    const order = [
      'Staff Platform Engineer', // title first
      'Acme', // company
      'Worldwide (Remote)', // location
      '$120k–$160k', // salary
      'Own the deploy platform end to end.', // description
      '2d ago', // posted-date footer
    ].map((s) => text.indexOf(s));
    // Every field present and in ascending document order.
    expect(order.every((i) => i >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it('shows the relative posted-date label in the tile footer when the VM carries one', () => {
    const { rerender } = render(<JobCard vm={baseVM} />);
    expect(screen.queryByText('3w ago')).toBeNull();
    rerender(<JobCard vm={{ ...baseVM, postedAtLabel: '3w ago' }} />);
    expect(screen.getByText('3w ago')).toBeTruthy();
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
    });
    const link = await screen.findByRole('link', {
      name: 'Staff Platform Engineer',
    });
    expect(link.getAttribute('href')).toBe(
      '/companies/acme/jobs/staff-platform-engineer',
    );
  });
});
