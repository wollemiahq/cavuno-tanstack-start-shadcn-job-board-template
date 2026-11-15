import { beforeEach, describe, expect, it, vi } from 'vitest';

// Stands in for Start's handler, including its Accept check: a page render
// answers 406 unless Accept names text/html or */*.
const startHandler = vi.hoisted(() =>
  vi.fn(async (request: Request) => {
    const accept = request.headers.get('Accept') || '*/*';
    if (!/(^|,)\s*(\*\/\*|text\/html)/.test(accept)) {
      return Response.json(
        { error: 'Only HTML requests are supported here' },
        { status: 406 },
      );
    }
    return new Response('<!doctype html>', {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  }),
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

import { isMachinePath, localizePath } from './lib/localized-path';
import server from './server';

/** A URL for every page route file (`p.$handle.tsx` is `/p/x`) whose URL
 * is a machine path: never localized, but rendered like any other page. */
const MACHINE_PATH_PAGES = Object.keys(import.meta.glob('./routes/*.tsx'))
  .map((file) => file.slice('./routes/'.length, -'.tsx'.length))
  .filter((name) => !name.startsWith('-') && !name.startsWith('__'))
  .map(
    (name) =>
      `/${name
        .split('.')
        .filter((segment) => segment !== 'index')
        .map((segment) =>
          segment.startsWith('$') ? 'x' : segment.replace(/_$/, ''),
        )
        .join('/')}`,
  )
  .filter((path) => isMachinePath(path));

const BROWSER_ACCEPT =
  'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8';

function get(path: string, accept: string) {
  return server.fetch(
    new Request(`https://board.example${path}`, { headers: { accept } }),
  );
}

function acceptSeenByStart() {
  return startHandler.mock.lastCall?.[0].headers.get('Accept');
}

describe('server entry Accept handling', () => {
  beforeEach(() => {
    startHandler.mockClear();
  });

  it('renders HTML, not a 406, for a page without a twin asked for as Markdown', async () => {
    const response = await get(localizePath('/pricing'), 'text/markdown');
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');
    expect(acceptSeenByStart()).toBe('text/html,*/*;q=0.8');
  });

  it('passes a browser Accept through unchanged', async () => {
    await get('/', BROWSER_ACCEPT);
    expect(acceptSeenByStart()).toBe(BROWSER_ACCEPT);
  });

  it.each(['/robots.txt', '/llms.txt', '/jobs/rss.xml', '/sitemap.xml'])(
    'leaves the request to server route %s as sent',
    async (path) => {
      await get(path, 'text/plain');
      expect(acceptSeenByStart()).toBe('text/plain');
    },
  );

  it('finds the pages on machine paths', () => {
    expect(MACHINE_PATH_PAGES).toEqual(
      expect.arrayContaining(['/embed/jobs', '/p/x', '/mcp/docs']),
    );
  });

  it.each(MACHINE_PATH_PAGES)(
    'renders HTML, not a 406, for page %s asked for as Markdown',
    async (path) => {
      const response = await get(path, 'text/markdown');
      expect(response.status).toBe(200);
      expect(acceptSeenByStart()).toBe('text/html,*/*;q=0.8');
    },
  );

  it('leaves the MCP server request as sent', async () => {
    await get('/mcp', 'application/json');
    expect(acceptSeenByStart()).toBe('application/json');
  });
});
