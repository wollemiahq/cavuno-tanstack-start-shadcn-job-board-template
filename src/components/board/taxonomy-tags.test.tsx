// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { TaxonomyTags } from './taxonomy-tags';

/**
 * The taxonomy chips are the SEO internal-linking spine, so the load-bearing
 * behaviors are: each chip is a real, crawlable `<a href>` LINK carrying its
 * resolved href (NOT a JS-navigated div — the reason we don't use react-aria
 * TagGroup here), and the overflow is an honest, NON-link "+N".
 */
afterEach(cleanup);

describe('TaxonomyTags', () => {
  const chips = [
    { key: 'react', name: 'React', href: '/jobs/skills/react' },
    { key: 'go', name: 'Go', href: '/jobs/skills/go' },
  ];

  function renderTags(ui: React.ReactElement) {
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
    const router = createRouter({
      routeTree: rootRoute.addChildren([indexRoute, skillRoute]),
      history: createMemoryHistory({ initialEntries: ['/'] }),
    });
    return render(<RouterProvider router={router} />);
  }

  it('renders each chip as a real anchor carrying its resolved href', async () => {
    const { container } = renderTags(<TaxonomyTags chips={chips} />);

    expect(await screen.findByRole('link', { name: 'React' })).toHaveAttribute(
      'href',
      '/jobs/skills/react',
    );
    expect(screen.getByRole('link', { name: 'Go' })).toHaveAttribute(
      'href',
      '/jobs/skills/go',
    );
    expect(container.querySelectorAll('a')).toHaveLength(2);
  });

  it('shows an honest +N overflow that is NOT a link', async () => {
    const { container } = renderTags(
      <TaxonomyTags chips={chips} overflow={3} />,
    );

    expect(await screen.findByText('+3')).toBeTruthy();
    expect(container.querySelectorAll('a')).toHaveLength(2);
    expect(screen.queryByRole('link', { name: '+3' })).toBeNull();
  });

  it('renders nothing when there are no chips and no overflow', () => {
    const { container } = renderTags(<TaxonomyTags chips={[]} />);
    expect(container.querySelector('[data-slot]')).toBeNull();
  });

  it('opens chips in a new tab when openInNewTab is set', async () => {
    const { container } = renderTags(
      <TaxonomyTags chips={chips} openInNewTab />,
    );

    await screen.findByRole('link', { name: 'React' });
    const anchors = [...container.querySelectorAll('a')];
    expect(anchors).toHaveLength(2);
    for (const anchor of anchors) {
      expect(anchor.getAttribute('target')).toBe('_blank');
      expect(anchor.getAttribute('rel')).toBe('noopener noreferrer');
    }
  });

  it('keeps chips in the same tab by default', async () => {
    const { container } = renderTags(<TaxonomyTags chips={chips} />);

    await screen.findByRole('link', { name: 'React' });
    const anchors = [...container.querySelectorAll('a')];
    expect(anchors.length).toBeGreaterThan(0);
    for (const anchor of anchors) {
      expect(anchor.getAttribute('target')).toBeNull();
      expect(anchor.getAttribute('rel')).toBeNull();
    }
  });
});
