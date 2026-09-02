// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  InPlaceListingSelect,
  MasterDetailLink,
  PreferListingWorkspace,
} from './master-detail-link';

import { DESKTOP_MEDIA_QUERY } from '@/hooks/use-desktop-media';
import { jobDestination } from '@/lib/master-detail-destination';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const destination = jobDestination({
  companySlug: 'acme',
  jobSlug: 'staff-engineer',
});

function mockDesktop(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => {
      expect(query).toBe(DESKTOP_MEDIA_QUERY);
      return {
        matches,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };
    }),
  });
}

function renderLink(ui: React.ReactElement) {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => ui,
  });
  const jobRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/companies/$companySlug/jobs/$jobSlug',
    component: () => <h1>Job detail</h1>,
  });
  const jobsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/jobs',
    validateSearch: (search: Record<string, unknown>) => ({
      selectedJob:
        typeof search.selectedJob === 'string' ? search.selectedJob : undefined,
    }),
    component: () => <h1>Jobs</h1>,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, jobRoute, jobsRoute]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  const view = render(<RouterProvider router={router} />);
  return { router, ...view };
}

describe('MasterDetailLink', () => {
  beforeEach(() => {
    mockDesktop(false);
  });

  it('always exposes the canonical href', async () => {
    renderLink(
      <MasterDetailLink destination={destination}>Staff</MasterDetailLink>,
    );
    const link = await screen.findByRole('link', { name: 'Staff' });
    expect(link).toHaveAttribute(
      'href',
      '/companies/acme/jobs/staff-engineer',
    );
  });

  it('does not rewrite desktop clicks without a provider', async () => {
    mockDesktop(true);
    const { router } = renderLink(
      <MasterDetailLink destination={destination}>Staff</MasterDetailLink>,
    );
    const navigateSpy = vi.spyOn(router, 'navigate');
    const link = await screen.findByRole('link', { name: 'Staff' });
    fireEvent.click(link);
    expect(navigateSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ to: '/jobs' }),
    );
  });

  it('PreferListingWorkspace + desktop primary click navigates to listing', async () => {
    mockDesktop(true);
    const { router } = renderLink(
      <PreferListingWorkspace>
        <MasterDetailLink destination={destination}>Staff</MasterDetailLink>
      </PreferListingWorkspace>,
    );
    const navigateSpy = vi.spyOn(router, 'navigate');
    const link = await screen.findByRole('link', { name: 'Staff' });
    fireEvent.click(link);
    expect(navigateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '/jobs',
        search: { selectedJob: 'staff-engineer' },
      }),
    );
  });

  it('PreferListingWorkspace + mobile leaves the canonical Link alone', async () => {
    mockDesktop(false);
    const { router } = renderLink(
      <PreferListingWorkspace>
        <MasterDetailLink destination={destination}>Staff</MasterDetailLink>
      </PreferListingWorkspace>,
    );
    const navigateSpy = vi.spyOn(router, 'navigate');
    const link = await screen.findByRole('link', { name: 'Staff' });
    expect(link).toHaveAttribute(
      'href',
      '/companies/acme/jobs/staff-engineer',
    );
    fireEvent.click(link);
    expect(navigateSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ to: '/jobs' }),
    );
  });

  it('PreferListingWorkspace + desktop + metaKey does not open listing', async () => {
    mockDesktop(true);
    const { router } = renderLink(
      <PreferListingWorkspace>
        <MasterDetailLink destination={destination}>Staff</MasterDetailLink>
      </PreferListingWorkspace>,
    );
    const navigateSpy = vi.spyOn(router, 'navigate');
    const link = await screen.findByRole('link', { name: 'Staff' });
    fireEvent.click(link, { metaKey: true });
    expect(navigateSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ to: '/jobs' }),
    );
  });

  it('InPlaceListingSelect + desktop calls onSelect with the selection key', async () => {
    mockDesktop(true);
    const onSelect = vi.fn((event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
    });
    const { router } = renderLink(
      <InPlaceListingSelect onSelect={onSelect}>
        <MasterDetailLink destination={destination}>Staff</MasterDetailLink>
      </InPlaceListingSelect>,
    );
    const navigateSpy = vi.spyOn(router, 'navigate');
    const link = await screen.findByRole('link', { name: 'Staff' });
    fireEvent.click(link);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0]?.[1]).toBe('staff-engineer');
    expect(navigateSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ to: '/jobs' }),
    );
  });

  it('InPlaceListingSelect wins over PreferListingWorkspace', async () => {
    mockDesktop(true);
    const onSelect = vi.fn((event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
    });
    const { router } = renderLink(
      <PreferListingWorkspace>
        <InPlaceListingSelect onSelect={onSelect}>
          <MasterDetailLink destination={destination}>Staff</MasterDetailLink>
        </InPlaceListingSelect>
      </PreferListingWorkspace>,
    );
    const navigateSpy = vi.spyOn(router, 'navigate');
    fireEvent.click(await screen.findByRole('link', { name: 'Staff' }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(navigateSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ to: '/jobs' }),
    );
  });

  it('openInNewTab sets target and never intercepts', async () => {
    mockDesktop(true);
    const onSelect = vi.fn();
    const { router } = renderLink(
      <PreferListingWorkspace>
        <InPlaceListingSelect onSelect={onSelect}>
          <MasterDetailLink destination={destination} openInNewTab>
            Staff
          </MasterDetailLink>
        </InPlaceListingSelect>
      </PreferListingWorkspace>,
    );
    const navigateSpy = vi.spyOn(router, 'navigate');
    const link = await screen.findByRole('link', { name: 'Staff' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    fireEvent.click(link);
    expect(onSelect).not.toHaveBeenCalled();
    expect(navigateSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ to: '/jobs' }),
    );
  });
});
