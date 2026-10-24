import { beforeEach, describe, expect, it, vi } from 'vitest';

import { m } from '../paraglide/messages';
import { baseLocale } from '../paraglide/runtime';
import { createJobsRssHandler } from './-jobs-rss-handler';
import { Route as BlogRssRoute } from './blog.rss[.]xml';

const fixture = vi.hoisted(() => ({
  activeContext: vi.fn(),
  primaryContext: vi.fn(),
  activeJobs: vi.fn(),
  primaryJobs: vi.fn(),
  activePosts: vi.fn(),
  primaryPosts: vi.fn(),
}));
vi.mock('../lib/board', () => ({
  getBoard: () => ({
    context: fixture.activeContext,
    jobs: { list: fixture.activeJobs },
    blog: { posts: { list: fixture.activePosts } },
  }),
  getPrimaryBoard: () => ({
    context: fixture.primaryContext,
    jobs: { list: fixture.primaryJobs },
    blog: { posts: { list: fixture.primaryPosts } },
  }),
}));
vi.mock('../lib/board-context-cache', () => ({
  readBoardContext: fixture.activeContext,
}));
vi.mock('../lib/public-origin', () => ({
  readPublicOrigin: async () => 'https://demo.example',
  readPrimaryPublicOrigin: async () => 'https://primary.example',
}));
vi.mock('@tanstack/react-start/server', () => ({
  getRequest: () =>
    new Request('https://preview.example/jobs/rss.xml', {
      headers: { Cookie: 'cavuno_data_source=demo' },
    }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  fixture.activeContext.mockResolvedValue({
    name: 'Demo fixture',
    language: baseLocale,
    features: { blog: false },
  });
  fixture.primaryContext.mockResolvedValue({
    name: 'Primary fixture',
    language: baseLocale,
    features: { blog: true },
  });
  for (const read of [
    fixture.activeJobs,
    fixture.primaryJobs,
    fixture.activePosts,
    fixture.primaryPosts,
  ])
    read.mockResolvedValue({ data: [] });
});

describe('RSS deployment identity with a demo preference', () => {
  it('serves the primary job feed and origin', async () => {
    const response = await createJobsRssHandler()();
    const xml = await response.text();
    expect(response.status).toBe(200);
    expect(xml).toContain(m.rssJobs_channelTitle({ name: 'Primary fixture' }));
    expect(xml).toContain('https://primary.example/jobs/rss.xml');
    expect(fixture.primaryJobs).toHaveBeenCalled();
    expect(fixture.activeContext).not.toHaveBeenCalled();
    expect(fixture.activeJobs).not.toHaveBeenCalled();
  });

  it('uses the primary blog feature flag, posts and origin', async () => {
    // SAFETY: this route defines a no-argument async GET returning Response.
    const handlers = BlogRssRoute.options.server!.handlers as {
      GET: () => Promise<Response>;
    };
    const response = await handlers.GET();
    const xml = await response.text();
    expect(response.status).toBe(200);
    expect(xml).toContain(m.rssBlog_channelTitle({ name: 'Primary fixture' }));
    expect(xml).toContain('https://primary.example/blog/rss.xml');
    expect(fixture.primaryPosts).toHaveBeenCalled();
    expect(fixture.primaryContext).toHaveBeenCalledWith({ cache: 'no-store' });
    expect(fixture.activeContext).not.toHaveBeenCalled();
    expect(fixture.activePosts).not.toHaveBeenCalled();
  });

  it('keeps the public blog feed off when only the demo blog is enabled', async () => {
    fixture.primaryContext.mockResolvedValue({
      name: 'Primary fixture',
      language: baseLocale,
      features: { blog: false },
    });
    fixture.activeContext.mockResolvedValue({
      name: 'Demo fixture',
      language: baseLocale,
      features: { blog: true },
    });
    // SAFETY: this route defines a no-argument async GET returning Response.
    const handlers = BlogRssRoute.options.server!.handlers as {
      GET: () => Promise<Response>;
    };
    expect((await handlers.GET()).status).toBe(404);
    expect(fixture.primaryPosts).not.toHaveBeenCalled();
    expect(fixture.activePosts).not.toHaveBeenCalled();
  });
});
