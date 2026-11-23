/**
 * Mount contract for the board's MCP server on its own host. The SDK's own
 * suite pins createMcpHandler's semantics; these tests pin that the starter
 * routes `/mcp`, `/mcp/server-card` and `/.well-known/ai-catalog.json` to it
 * with the board's key, that `/mcp/docs` stays the starter's own page, and
 * that sign-in from assistants (the OAuth paths) is on only with a `pk_…`
 * key and reaches this site's consent page with the query intact.
 */
import { createMemoryHistory, createRouter } from '@tanstack/react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { localizePath } from '../lib/localized-path';
import { localizedRedirectLocation } from '../lib/localized-url-redirect';
import {
  MCP_CONSENT_PATH,
  mcpAuthorizeQuery,
  mcpAuthorizeRedirect,
} from '../lib/mcp-authorize-query';
import { mdUrlRedirectLocation } from '../lib/md-url-redirect';
import { routeTree } from '../routeTree.gen';
import URL_WORDS from '../url-words.json';
import { Route as AiCatalogRoute } from './[.]well-known.ai-catalog[.]json';
import { Route as AuthorizationServerRoute } from './[.]well-known.oauth-authorization-server';
import { Route as ProtectedResourceRoute } from './[.]well-known.oauth-protected-resource.index';
import { Route as McpProtectedResourceRoute } from './[.]well-known.oauth-protected-resource.mcp';
import { Route as McpRoute } from './mcp.index';
import { Route as ServerCardRoute } from './mcp.server-card';
import { Route as AuthorizeRoute } from './oauth.authorize';
import { Route as RegisterRoute } from './oauth.register';
import { Route as RevokeRoute } from './oauth.revoke';
import { Route as TokenRoute } from './oauth.token';

import type { LocaleRouting } from '../lib/localized-path';

vi.mock('../lib/og-render', () => ({ renderOgPng: vi.fn() }));
const env = vi.hoisted(() => ({
  current: { apiUrl: 'https://api.example.test', board: 'pk_test_board' },
}));
vi.mock('../lib/env', () => ({ getServerEnv: () => env.current }));

const UPSTREAM = 'https://api.example.test/v1/boards/pk_test_board';
const SITE = 'https://board.example.com';

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

type RouteHandler = (
  context: ReturnType<typeof handlerContext<string>>,
) => Promise<Response>;

/** Any of the route modules above, served by its handler for the method. */
async function serveRoute(
  route: { options: { server?: { handlers?: object } } },
  request: Request,
): Promise<Response> {
  // SAFETY: these route modules declare their handlers as an object keyed by
  // method, each returning mcpHandler's response; a missing method fails.
  const handlers = route.options.server?.handlers as
    | Record<string, RouteHandler | undefined>
    | undefined;
  const handle = handlers?.[request.method];
  if (!handle) throw new Error(`no ${request.method} handler`);
  return handle(handlerContext(request, new URL(request.url).pathname));
}

afterEach(() => {
  vi.unstubAllGlobals();
  env.current = { apiUrl: 'https://api.example.test', board: 'pk_test_board' };
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

describe('sign-in from assistants', () => {
  const RAW_QUERY =
    '?response_type=code&client_id=a&state=1e3&n=12345678901234567890&scope=a+b';
  const DISCOVERY = [
    [
      '/.well-known/oauth-protected-resource',
      ProtectedResourceRoute,
      'mcp/oauth/.well-known/oauth-protected-resource',
    ],
    [
      '/.well-known/oauth-protected-resource/mcp',
      McpProtectedResourceRoute,
      'mcp/oauth/.well-known/oauth-protected-resource/mcp',
    ],
    [
      '/.well-known/oauth-authorization-server',
      AuthorizationServerRoute,
      'mcp/oauth/.well-known/oauth-authorization-server',
    ],
  ] as const;
  const ENDPOINTS = [
    ['/oauth/register', RegisterRoute],
    ['/oauth/token', TokenRoute],
    ['/oauth/revoke', RevokeRoute],
  ] as const;

  it('sends /oauth/authorize to the consent page with the query intact', async () => {
    expect(matchRoute('/oauth/authorize')).toBe(AuthorizeRoute);
    const fetchMock = mockUpstream('', 'text/plain');

    const res = await serveRoute(
      AuthorizeRoute,
      new Request(`${SITE}/oauth/authorize${RAW_QUERY}`),
    );

    expect(res.status).toBe(302);
    const location = res.headers.get('location') ?? '';
    expect(location).toBe(`${localizePath(MCP_CONSENT_PATH)}${RAW_QUERY}`);
    expect(fetchMock).not.toHaveBeenCalled();

    // The consent page then keeps the query as it is for the Board API.
    const kept = mcpAuthorizeRedirect(new Request(`${SITE}${location}`));
    expect(kept?.status).toBe(307);
    const keptUrl = new URL(kept?.headers.get('location') ?? '', SITE);
    expect(keptUrl.pathname).toBe(localizePath(MCP_CONSENT_PATH));
    expect(mcpAuthorizeQuery(keptUrl.search)).toBe(RAW_QUERY);
  });

  it.each(DISCOVERY)(
    'forwards GET %s to the Board API naming this site',
    async (path, route, upstream) => {
      expect(matchRoute(path)).toBe(route);
      const fetchMock = mockUpstream('{"resource":"x"}', 'application/json');

      const res = await serveRoute(route, new Request(`${SITE}${path}`));

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ resource: 'x' });
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(`${UPSTREAM}/${upstream}`);
      expect(new Headers(init?.headers).get('x-cavuno-mcp-site')).toBe(SITE);
    },
  );

  it.each(ENDPOINTS)(
    'forwards POST %s to the Board API, and answers its preflight',
    async (path, route) => {
      expect(matchRoute(path)).toBe(route);
      const fetchMock = mockUpstream('{"ok":true}', 'application/json');
      const body = 'grant_type=authorization_code&code=c';

      const res = await serveRoute(
        route,
        new Request(`${SITE}${path}`, {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body,
        }),
      );

      expect(res.status).toBe(200);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(`${UPSTREAM}/mcp${path}`);
      expect(init?.method).toBe('POST');
      expect(await new Response(init?.body).text()).toBe(body);
      expect(new Headers(init?.headers).get('x-cavuno-mcp-site')).toBe(SITE);

      const preflight = await serveRoute(
        route,
        new Request(`${SITE}${path}`, { method: 'OPTIONS' }),
      );
      expect(preflight.status).toBe(204);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );

  it('keeps a board configured by slug anonymous: no sign-in paths, /mcp works', async () => {
    env.current = { apiUrl: 'https://api.example.test', board: 'test-board' };
    const fetchMock = mockUpstream('{"jsonrpc":"2.0"}', 'application/json');

    for (const [path, route] of [
      ...DISCOVERY,
      ['/oauth/authorize', AuthorizeRoute],
    ] as const) {
      const res = await serveRoute(route, new Request(`${SITE}${path}`));
      expect(res.status, path).toBe(404);
    }
    const token = await serveRoute(
      TokenRoute,
      new Request(`${SITE}/oauth/token`, { method: 'POST', body: 'x' }),
    );
    expect(token.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();

    const res = await serveMcp(
      new Request(`${SITE}/mcp`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{"jsonrpc":"2.0","id":1,"method":"tools/list"}',
      }),
    );
    expect(res.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.example.test/v1/boards/test-board/mcp');
    expect(new Headers(init?.headers).has('x-cavuno-mcp-site')).toBe(false);
  });

  it('is left to the handler by the server entry’s redirects, on a localized board', () => {
    const dutchBoard: LocaleRouting = {
      baseLocale: 'nl',
      isLocale: (tag) => ['nl', 'fr'].includes(tag),
      words: URL_WORDS,
    };
    for (const path of [
      ...DISCOVERY.map(([discovery]) => discovery),
      ...ENDPOINTS.map(([endpoint]) => endpoint),
      '/oauth/authorize',
    ]) {
      const request = new Request(`${SITE}${path}${RAW_QUERY}`);
      expect(mcpAuthorizeRedirect(request), path).toBeNull();
      expect(mdUrlRedirectLocation(request, dutchBoard), path).toBeNull();
      expect(localizedRedirectLocation(request, dutchBoard), path).toBeNull();
    }
  });
});
