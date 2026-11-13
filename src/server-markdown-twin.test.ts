import { beforeEach, describe, expect, it, vi } from 'vitest';

const startHandler = vi.hoisted(() =>
  vi.fn(async (_request: Request) => new Response('ok')),
);

vi.mock('@tanstack/react-start/server', () => ({
  createServerEntry: (entry: {
    fetch: (request: Request) => Promise<Response>;
  }) => entry,
  createStartHandler: () => startHandler,
  defaultStreamHandler: {},
}));
vi.mock('./paraglide/server', () => ({
  paraglideMiddleware: (_request: Request, render: () => Promise<Response>) =>
    render(),
}));
vi.mock('./lib/public-html-cache', () => ({
  readPublicHtmlCache: async () => null,
  withPublicHtmlCacheHeaders: (_request: Request, response: Response) =>
    response,
  writePublicHtmlCache: async () => {},
}));

import { localizePath } from './lib/localized-path';
import server from './server';

const JOB = localizePath('/companies/acme/jobs/engineer');

function get(path: string, accept = 'text/markdown') {
  return server.fetch(
    new Request(`https://board.example${path}`, { headers: { accept } }),
  );
}

function pathSeenByStart() {
  const request = startHandler.mock.lastCall?.[0];
  return request ? new URL(request.url).pathname : null;
}

describe('server entry Markdown twins', () => {
  beforeEach(() => {
    startHandler.mockClear();
  });

  it('hands a twin URL to the internal twin route, Accept as sent', async () => {
    await get(`${JOB}.md`);
    expect(pathSeenByStart()).toBe(`/markdown-twin${JOB}.md`);
    expect(startHandler.mock.lastCall?.[0].headers.get('accept')).toBe(
      'text/markdown',
    );
  });

  it('renders a .md URL without a twin as a page', async () => {
    await get('/no-such-page.md');
    expect(pathSeenByStart()).toBe('/no-such-page.md');
  });

  it('refuses outside requests for the internal twin route', async () => {
    const response = await get(`/markdown-twin${JOB}.md`);
    expect(response.status).toBe(404);
    expect(startHandler).not.toHaveBeenCalled();
  });
});
