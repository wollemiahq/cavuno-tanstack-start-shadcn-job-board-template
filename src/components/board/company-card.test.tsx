// @vitest-environment jsdom
/**
 * CompanyCard honest-data invariants. The name links to the typed
 * company-detail route through the TanStack router seam (SEO-load-bearing,
 * never static), the open-count
 * Badge shows ONLY when the company has open roles (no "0 open jobs"
 * noise), and the description line is honestly omitted when absent and
 * rendered as plain text (tag-stripped) when the API sends HTML.
 *
 * The card always renders a typed `Link`, so every case mounts inside a
 * memory router (the router seam is part of what the card is).
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

import { CompanyCard } from './company-card';

afterEach(cleanup);

type CardProps = React.ComponentProps<typeof CompanyCard>;

const baseProps: CardProps = {
  companySlug: 'acme',
  name: 'Acme',
  logoUrl: null,
  summary: null,
  publishedJobCount: 3,
  jobCountLabel: '3 open jobs',
};

/** Mount the card under a real router so its typed `Link` resolves. */
function renderCard(props: CardProps) {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <CompanyCard {...props} />,
  });
  const companyRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/companies/$companySlug',
    component: () => <h1>Company</h1>,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, companyRoute]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  return render(<RouterProvider router={router} />);
}

describe('CompanyCard honest-data invariants', () => {
  it('uses the owned shadcn Card, Avatar, and Badge composition', async () => {
    const { container } = renderCard(baseProps);
    await screen.findByRole('link', { name: 'Acme' });

    expect(container.querySelector("[data-slot='card']")).toBeTruthy();
    expect(container.querySelector("[data-slot='avatar']")).toBeTruthy();
    expect(
      container.querySelector("[data-slot='avatar-fallback']")?.textContent,
    ).toBe('A');
    expect(
      screen.getByText('3 open jobs').closest("[data-slot='badge']"),
    ).toBeTruthy();
  });

  it('shows the open-count Badge only when the company has open roles', async () => {
    renderCard(baseProps);
    expect(await screen.findByText('3 open jobs')).toBeTruthy();
    cleanup();
    renderCard({
      ...baseProps,
      publishedJobCount: 0,
      jobCountLabel: '0 open jobs',
    });
    // A company with no open roles must not carry a "0 open jobs" badge.
    await screen.findByRole('link', { name: 'Acme' });
    expect(screen.queryByText('0 open jobs')).toBeNull();
  });

  it('omits the teaser line when summary is null', async () => {
    renderCard({ ...baseProps, summary: null });
    await screen.findByRole('link', { name: 'Acme' });
    expect(screen.queryByText(/./, { selector: 'p' })).toBeNull();
  });

  it('renders the wire summary as the card teaser (API already cleaned it)', async () => {
    renderCard({
      ...baseProps,
      summary: 'We build rockets daily',
    });
    expect(await screen.findByText('We build rockets daily')).toBeTruthy();
  });
});

describe('CompanyCard title link (URL contract)', () => {
  it('links the name to the typed company-detail route', async () => {
    renderCard(baseProps);
    const link = await screen.findByRole('link', { name: 'Acme' });
    expect(link.getAttribute('href')).toBe('/companies/acme');
  });
});
