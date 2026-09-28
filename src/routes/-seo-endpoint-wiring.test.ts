import { describe, expect, it, vi } from 'vitest';

import { Route as AdsRoute } from './ads[.]txt';
import { Route as IndexNowRoute } from './indexnow-key[.]txt';
import { Route as RobotsRoute } from './robots[.]txt';

const fixture = vi.hoisted(() => ({
  seo: {
    canonicalBase: 'https://tenant.example',
    adsTxt: 'fixture ads',
    indexNowKey: 'fixture-key',
  },
  read: vi.fn(),
  robots: vi.fn(),
  ads: vi.fn(),
  indexNow: vi.fn(),
}));
vi.mock('../lib/board', () => ({ getBoard: () => ({ seo: fixture.read }) }));
vi.mock('../lib/seo-handlers', () => ({
  robotsResponse: fixture.robots,
  adsTxtResponse: fixture.ads,
  indexNowResponse: fixture.indexNow,
}));
describe('public SEO endpoint tenant wiring', () => {
  it.each([
    [RobotsRoute, fixture.robots],
    [AdsRoute, fixture.ads],
    [IndexNowRoute, fixture.indexNow],
  ])(
    'reads request-owned board SEO and returns the response from its handler',
    async (route, handler) => {
      fixture.read.mockResolvedValue(fixture.seo);
      const response = new Response('fixture response');
      handler.mockReturnValue(response);
      // SAFETY: each imported route defines GET as an async function with no arguments that returns its SEO handler response.
      const handlers = route.options.server!.handlers as {
        GET: () => Promise<Response>;
      };
      const get = handlers.GET;
      const result = await get();
      expect(fixture.read).toHaveBeenCalled();
      expect(handler).toHaveBeenCalledWith(fixture.seo);
      expect(result).toBe(response);
    },
  );
});
