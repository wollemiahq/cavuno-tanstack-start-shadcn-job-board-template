import { beforeEach, describe, expect, it, vi } from 'vitest';

const startHandler = vi.hoisted(() =>
  vi.fn(
    async (_request: Request) =>
      new Response('ok', {
        headers: { 'content-type': 'text/html; charset=utf-8', vary: 'Cookie' },
      }),
  ),
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
const BROWSER_ACCEPT =
  'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8';

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

  it.each([
    [JOB, `${JOB}.md`],
    [localizePath('/jobs'), `${localizePath('/jobs')}.md`],
    ['/', '/index.md'],
  ])('serves the twin of %s when Accept lists Markdown', async (path, twin) => {
    await get(`${path}?page=2`, 'text/html;q=0.5, text/markdown');
    expect(pathSeenByStart()).toBe(`/markdown-twin${twin}`);
    expect(new URL(startHandler.mock.lastCall![0].url).search).toBe('?page=2');
  });

  it.each([BROWSER_ACCEPT, '*/*', 'text/markdown;q=0'])(
    'renders the page as HTML for Accept %s, varying on Accept',
    async (accept) => {
      const response = await get(JOB, accept);
      expect(pathSeenByStart()).toBe(JOB);
      expect(response.headers.get('vary')).toBe('Cookie, Accept');
    },
  );

  it('leaves a page without a twin as today', async () => {
    const path = localizePath('/companies/acme/salaries');
    const response = await get(path);
    expect(pathSeenByStart()).toBe(path);
    expect(startHandler.mock.lastCall?.[0].headers.get('accept')).toBe(
      'text/html,*/*;q=0.8',
    );
    expect(response.headers.get('vary')).toBe('Cookie');
  });
});
