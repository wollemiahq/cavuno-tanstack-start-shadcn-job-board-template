/**
 * Mount contract for the board's MCP server on its own host. The SDK's own
 * suite pins createMcpHandler's semantics; these tests pin that the starter
 * routes `/mcp`, `/mcp/server-card` and `/.well-known/ai-catalog.json` to it
 * with the board's key, and that `/mcp/docs` stays the starter's own page.
 */
import { createMemoryHistory, createRouter } from '@tanstack/react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { routeTree } from '../routeTree.gen';
import { Route as AiCatalogRoute } from './[.]well-known.ai-catalog[.]json';
import { Route as McpRoute } from './mcp.index';
import { Route as ServerCardRoute } from './mcp.server-card';

vi.mock('../lib/og-render', () => ({ renderOgPng: vi.fn() }));
vi.mock('../lib/env', () => ({
  getServerEnv: () => ({
    apiUrl: 'https://api.example.test',
    board: 'pk_test_board',
  }),
}));

const UPSTREAM = 'https://api.example.test/v1/boards/pk_test_board';

function matchRoute(pathname: string) {
  const router = createRouter({ routeTree, history: createMemoryHistory() });
  const [, , route] = router.getMatchedRoutes(pathname);
  if (!route) throw new Error(`no route matches ${pathname}`);
  return route;
}

function handlerContext<const Path extends string>(
  request: Request,
  pathname: Path,
) {
  return {
    request,
    context: undefined,
    params: {},
    pathname,
    next: () => {
      throw new Error('MCP handlers must not defer');
    },
  };
}

async function serveMcp(request: Request): Promise<Response> {
  const handlers = McpRoute.options.server?.handlers;
  if (!handlers || !('ANY' in handlers) || !handlers.ANY) {
    throw new Error('expected /mcp to declare an ANY server handler');
  }
  const result = await handlers.ANY(handlerContext(request, '/mcp'));
  if (!(result instanceof Response)) throw new Error('expected a Response');
  return result;
}

async function serveServerCard(request: Request): Promise<Response> {
  const handlers = ServerCardRoute.options.server?.handlers;
  if (!handlers || !('GET' in handlers) || !handlers.GET) {
    throw new Error('expected /mcp/server-card to declare a GET handler');
  }
  const result = await handlers.GET(
    handlerContext(request, '/mcp/server-card'),
  );
  if (!(result instanceof Response)) throw new Error('expected a Response');
  return result;
}

async function serveAiCatalog(request: Request): Promise<Response> {
  const handlers = AiCatalogRoute.options.server?.handlers;
  if (!handlers || !('GET' in handlers) || !handlers.GET) {
    throw new Error('expected the AI Catalog to declare a GET handler');
  }
  const result = await handlers.GET(
    handlerContext(request, '/.well-known/ai-catalog.json'),
  );
  if (!(result instanceof Response)) throw new Error('expected a Response');
  return result;
}

function mockUpstream(body: string, contentType: string) {
  const fetchMock = vi.fn(
    async (_url: string, _init?: RequestInit) =>
      new Response(body, { headers: { 'content-type': contentType } }),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('MCP server mount', () => {
  it('forwards POST /mcp to the Board API with the board key', async () => {
    expect(matchRoute('/mcp')).toBe(McpRoute);
    const reply = '{"jsonrpc":"2.0","id":1,"result":{"tools":[]}}';
    const fetchMock = mockUpstream(reply, 'application/json');
    const message = '{"jsonrpc":"2.0","id":1,"method":"tools/list"}';

    const res = await serveMcp(
      new Request('https://board.example.com/mcp', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json, text/event-stream',
        },
        body: message,
      }),
    );

    expect(res.status).toBe(200);
    expect(await res.text()).toBe(reply);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${UPSTREAM}/mcp`);
    expect(init?.method).toBe('POST');
    expect(await new Response(init?.body).text()).toBe(message);
  });

  it('lets the handler answer other methods on /mcp itself', async () => {
    const fetchMock = mockUpstream('', 'text/plain');
    const res = await serveMcp(
      new Request('https://board.example.com/mcp', { method: 'DELETE' }),
    );
    expect(res.status).toBe(405);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ['/mcp/server-card', ServerCardRoute, serveServerCard, 'server-card'],
    [
      '/.well-known/ai-catalog.json',
      AiCatalogRoute,
      serveAiCatalog,
      'ai-catalog',
    ],
  ] as const)(
    'serves GET %s from the Board API',
    async (path, route, serve, upstream) => {
      expect(matchRoute(path)).toBe(route);
      const fetchMock = mockUpstream('{"name":"board"}', 'application/json');
      const res = await serve(new Request(`https://board.example.com${path}`));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ name: 'board' });
      expect(fetchMock.mock.calls[0][0]).toBe(`${UPSTREAM}/mcp/${upstream}`);
    },
  );

  it('keeps /mcp/docs as the starter page, not a forwarded route', () => {
    const route = matchRoute('/mcp/docs');
    expect(route.id).toBe('/mcp/docs');
    expect(route.options.component).toBeDefined();
    expect(route.options.server?.handlers).toBeUndefined();
    expect(route.parentRoute?.id).toBe('__root__');
  });
});
