// @vitest-environment jsdom
/**
 * JobCard honest-data invariants: omission of absent salary/summary, the skill-tag cap
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
import { makeJobCardVM } from '@/test/fixtures';

afterEach(cleanup);

// Fixture values are deliberately NOT formatter-shaped (see
// src/test/fixtures.ts): assertions reference VM fields symbolically so
// a presentation change never requires a content update in this file.
const baseVM = makeJobCardVM();

const tag = (name: string): JobCardVM['tags'][number] => ({
  key: `k-${name}`,
  name,
  href: `/jobs/skills/${name}`,
});

function renderCard(ui: React.ReactElement) {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => ui,
  });
  const skillRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/jobs/skills/$skill',
    component: () => null,
  });
  const jobRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/companies/$companySlug/jobs/$jobSlug',
    component: () => null,
  });
  const jobsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/jobs',
    component: () => null,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([
      indexRoute,
      skillRoute,
      jobRoute,
      jobsRoute,
    ]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  return render(<RouterProvider router={router} />);
}

describe('JobCard stress invariants', () => {
  it('composes the owned shadcn Card surface', () => {
    render(<JobCard vm={baseVM} />);

    expect(
      screen.getByRole('article').querySelector('[data-slot="card"]'),
    ).not.toBeNull();
  });

  it('caps skill tags at 3 and shows an overflow count for the rest', async () => {
    renderCard(
      <JobCard
        vm={{
          ...baseVM,
          tags: ['React', 'Go', 'Kubernetes', 'Postgres', 'Rust'].map(tag),
        }}
      />,
    );
    expect(await screen.findByText('React')).toBeTruthy();
    expect(screen.getByText('Go')).toBeTruthy();
    expect(screen.getByText('Kubernetes')).toBeTruthy();
    expect(screen.queryByText('Postgres')).toBeNull();
    expect(screen.getByText('+2')).toBeTruthy();
  });

  it('shows no overflow badge when three or fewer tags', async () => {
    renderCard(
      <JobCard vm={{ ...baseVM, tags: ['React', 'Go'].map(tag) }} />,
    );
    await screen.findByText('React');
    expect(screen.queryByText(/^\+\d+$/)).toBeNull();
  });

  it('renders location and salary as separate lines like the workspace card, omitting salary when absent', () => {
    const { rerender } = render(<JobCard vm={baseVM} />);
    // Location and salary render as separate lines, NOT the combined
    // compLine. Fields are referenced symbolically (neutral fixture values)
    // so a salary/location presentation change never edits this test.
    expect(screen.getByText(baseVM.locationLabel)).toBeTruthy();
    expect(screen.getByText(baseVM.salaryLabel!)).toBeTruthy();
    expect(screen.queryByText(baseVM.compLine!)).toBeNull();
    // Salary omitted when the VM has none; location still shows.
    rerender(<JobCard vm={{ ...baseVM, salaryLabel: null }} />);
    expect(screen.queryByText(baseVM.salaryLabel!)).toBeNull();
    expect(screen.getByText(baseVM.locationLabel)).toBeTruthy();
  });

  it('orders the tile like the workspace result card: title → company → location → salary → description', () => {
    const { container } = render(
      <JobCard vm={{ ...baseVM, postedAtLabel: '2d ago' }} />,
    );
    const text = (container.textContent ?? '').replace(/\s+/g, ' ');
    const order = [
      baseVM.title, // title first
      baseVM.companyName!, // company
      baseVM.locationLabel, // location
      baseVM.salaryLabel!, // salary
      baseVM.summary!, // description
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
  function renderInRouter(
    vm: JobCardVM,
    props: { openInNewTab?: boolean } = {},
  ) {
    const rootRoute = createRootRoute();
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
      component: () => <JobCard vm={vm} {...props} />,
    });
    const jobRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/companies/$companySlug/jobs/$jobSlug',
      component: () => <h1>Job detail</h1>,
    });
    const jobsRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/jobs',
      component: () => <h1>Jobs</h1>,
    });
    const router = createRouter({
      routeTree: rootRoute.addChildren([indexRoute, jobRoute, jobsRoute]),
      history: createMemoryHistory({ initialEntries: ['/'] }),
    });
    render(<RouterProvider router={router} />);
  }

  const linkedVM: JobCardVM = {
    ...baseVM,
    companySlug: 'acme',
    jobSlug: 'staff-platform-engineer',
    detailHref: '/companies/acme/jobs/staff-platform-engineer',
    tags: [tag('React')],
  };

  it('links the title to the typed job-detail route when slugs are present', async () => {
    renderInRouter(linkedVM);
    const link = await screen.findByRole('link', {
      name: 'Staff Platform Engineer',
    });
    expect(link.getAttribute('href')).toBe(
      '/companies/acme/jobs/staff-platform-engineer',
    );
  });

  it('opens the title and taxonomy chips in a new tab when openInNewTab is set', async () => {
    renderInRouter(linkedVM, { openInNewTab: true });

    const title = await screen.findByRole('link', {
      name: 'Staff Platform Engineer',
    });
    expect(title.getAttribute('target')).toBe('_blank');
    expect(title.getAttribute('rel')).toBe('noopener noreferrer');

    const chip = screen.getByRole('link', { name: 'React' });
    expect(chip.getAttribute('target')).toBe('_blank');
    expect(chip.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('keeps title and taxonomy chips in the same tab by default', async () => {
    renderInRouter(linkedVM);

    const title = await screen.findByRole('link', {
      name: 'Staff Platform Engineer',
    });
    expect(title.getAttribute('target')).toBeNull();
    expect(title.getAttribute('rel')).toBeNull();

    const chip = screen.getByRole('link', { name: 'React' });
    expect(chip.getAttribute('target')).toBeNull();
    expect(chip.getAttribute('rel')).toBeNull();
  });
});
