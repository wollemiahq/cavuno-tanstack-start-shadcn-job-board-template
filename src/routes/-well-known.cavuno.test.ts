import {
  compileManifest,
  enumerateRouteEntries,
} from '@cavuno/board/route-contract';
import { routeEntriesFromTanStackRouteTree } from '@cavuno/board/well-known';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Mount contract for `/.well-known/cavuno.json`. Pins the starter wiring of
 * createWellKnownHandler and routeEntriesFromTanStackRouteTree against this
 * board's canonical path structure.
 *
 * The route lazy-imports routeTree.gen at request time; we mock that module
 * with a tree that mirrors the starter's public roles so the test stays free
 * of the cloudflare:workers graph that full routeTree import would pull in.
 * A separate assertion pins the real routeTree's job-detail template via the
 * file-based enumerator (no full gen import).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * Minimal TanStack-shaped tree covering the roles the mount must publish.
 * Paths match this starter's file routes (companies/$companySlug/jobs/$jobSlug,
 * alerts.manage, alerts.confirm).
 */
const starterRoleTree = {
  id: '__root__',
  children: [
    { id: '/', fullPath: '/' },
    { id: '/jobs', fullPath: '/jobs' },
    {
      id: '/companies/$companySlug/jobs/$jobSlug',
      fullPath: '/companies/$companySlug/jobs/$jobSlug',
    },
    { id: '/alerts/manage', fullPath: '/alerts/manage' },
    { id: '/alerts/confirm', fullPath: '/alerts/confirm' },
    { id: '/companies/$companySlug', fullPath: '/companies/$companySlug' },
    { id: '/blog/$postSlug', fullPath: '/blog/$postSlug' },
  ],
};

vi.mock('../routeTree.gen', () => ({
  routeTree: starterRoleTree,
}));

import { Route } from './[.]well-known.cavuno[.]json';

type GetHandler = (ctx: { request: Request }) => Promise<Response> | Response;

function getHandler(): GetHandler {
  const handlers = Route.options.server?.handlers as
    | { GET?: GetHandler }
    | GetHandler
    | undefined;
  const get =
    typeof handlers === 'function'
      ? undefined
      : handlers && typeof handlers === 'object'
        ? handlers.GET
        : undefined;
  if (typeof get !== 'function') {
    throw new Error(
      'expected /.well-known/cavuno.json to export a GET server handler',
    );
  }
  return get;
}

describe('/.well-known/cavuno.json mount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('serves ManifestV1 with cache headers and starter canonical roles', async () => {
    const request = new Request(
      'https://board.example.com/.well-known/cavuno.json',
    );
    const res = await getHandler()({ request } as never);

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/json');
    expect(res.headers.get('cache-control')).toBe('public, max-age=300');

    const body = (await res.json()) as {
      version: number;
      roles: Record<string, string>;
    };
    expect(body.version).toBe(1);
    expect(body.roles.jobDetail).toBe('/companies/:companySlug/jobs/:jobSlug');
    expect(body.roles.alertsManage).toBe('/alerts/manage');
    expect(body.roles.alertsConfirm).toBe('/alerts/confirm');

    // At least one $param route converted to :param form.
    const withParams = Object.values(body.roles).filter((t) => t.includes(':'));
    expect(withParams.length).toBeGreaterThan(0);
    expect(withParams.some((t) => t.includes('$'))).toBe(false);
  });

  it('is declared at the exact /.well-known/cavuno.json path', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/routes/[.]well-known.cavuno[.]json.ts'),
      'utf8',
    );
    expect(source).toContain("createFileRoute('/.well-known/cavuno.json')");
    expect(source).toContain('createWellKnownHandler');
    expect(source).toContain('routeEntriesFromTanStackRouteTree');
    expect(source).toContain("import('../routeTree.gen')");
  });

  it('real src/routes file tree compiles jobDetail to the canonical template', () => {
    // Independent of the mock: walk the actual route files the same way
    // route-contract's TanStack file parser does, so a rename of the job
    // detail route would fail this gate even if the mock stayed green.
    const routesDir = resolve(process.cwd(), 'src/routes');
    const paths: string[] = [];
    for (const name of readdirSync(routesDir)) {
      if (name.startsWith('-')) continue;
      if (!/\.(tsx?|jsx?)$/.test(name)) continue;
      paths.push(join('src/routes', name));
    }
    const entries = enumerateRouteEntries(paths);
    const { manifest } = compileManifest(entries);
    expect(manifest.roles.jobDetail).toBe(
      '/companies/:companySlug/jobs/:jobSlug',
    );
    expect(manifest.roles.alertsManage).toBe('/alerts/manage');
    expect(manifest.roles.alertsConfirm).toBe('/alerts/confirm');
  });

  it('routeEntriesFromTanStackRouteTree converts $param → :param', () => {
    const entries = routeEntriesFromTanStackRouteTree(starterRoleTree);
    expect(entries.map((e) => e.template)).toContain(
      '/companies/:companySlug/jobs/:jobSlug',
    );
  });
});
