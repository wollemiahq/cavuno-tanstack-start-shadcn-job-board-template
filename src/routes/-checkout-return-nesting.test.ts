import { createMemoryHistory, createRouter } from '@tanstack/react-router';
import { describe, expect, it, vi } from 'vitest';

import { routeTree } from '../routeTree.gen';

vi.mock('../lib/og-render', () => ({ renderOgPng: vi.fn() }));

describe('checkout return routing', () => {
  it.each([
    ['/post/success', '/post'],
    ['/post/checkout-canceled', '/post'],
    ['/employer/$slug/jobs/', '/employer/$slug/jobs'],
    ['/employer/$slug/jobs/new', '/employer/$slug/jobs'],
  ])(
    '%s is not hidden under the posting wizard or jobs page',
    (path, blockedParent) => {
      const router = createRouter({
        routeTree,
        history: createMemoryHistory(),
      });
      const route = Object.values(router.routesById).find(
        (candidate) => candidate.fullPath === path,
      );
      expect(route, 'Checkout destination must exist').toBeDefined();
      const ancestors: string[] = [];
      for (let parent = route?.parentRoute; parent; parent = parent.parentRoute)
        ancestors.push(parent.fullPath);
      expect(ancestors).not.toContain(blockedParent);
    },
  );
});
