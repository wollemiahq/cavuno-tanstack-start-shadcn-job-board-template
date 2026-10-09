import {
  compileManifest,
  enumerateRouteEntries,
  validateManifest,
} from '@cavuno/board/route-contract';
import { routeEntriesFromTanStackRouteTree } from '@cavuno/board/well-known';
import { describe, expect, it } from 'vitest';

/**
 * Mount contract for `/.well-known/cavuno.json`. Pins the starter wiring of
 * createWellKnownHandler and routeEntriesFromTanStackRouteTree against this
 * board's canonical path structure.
 *
 * Exercise the handler with a deferred route tree, then verify the real
 * file-based route inventory independently. The route module must not import
 * that inventory eagerly: it is itself a member of the generated tree.
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
    { id: '/impressum', fullPath: '/impressum' },
    { id: '/companies/$companySlug', fullPath: '/companies/$companySlug' },
    { id: '/blog/$postSlug', fullPath: '/blog/$postSlug' },
  ],
};

import { baseLocale } from '../paraglide/runtime';
import URL_WORDS from '../url-words.json';
import { createWellKnownRouteHandler } from './-well-known-handler';

/** No URL words: the canonical (English) templates. */
const CANONICAL_WORDS = {};

async function getWellKnown(request: Request): Promise<Response> {
  const result = await createWellKnownRouteHandler(
    async () => starterRoleTree,
    () => true,
    CANONICAL_WORDS,
  )(request);
  if (!(result instanceof Response)) {
    throw new Error('The well-known GET handler must return a response');
  }
  return result;
}

describe('/.well-known/cavuno.json mount', () => {
  it('serves ManifestV1 with cache headers and starter canonical roles', async () => {
    const request = new Request(
      'https://board.example.com/.well-known/cavuno.json',
    );
    const res = await getWellKnown(request);

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/json');
    expect(res.headers.get('cache-control')).toBe('public, max-age=300');

    const parsed = validateManifest(await res.json());
    if (!parsed.ok) {
      throw new Error(
        `Invalid well-known manifest: ${JSON.stringify(parsed.errors)}`,
      );
    }
    const body = parsed.manifest;
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
    expect(source).not.toMatch(/import\s+\{\s*routeTree\s*\}\s+from/);
  });

  it('real src/routes file tree compiles jobDetail to the canonical template', () => {
    // Independent of the fixture: walk the actual route files the same way
    // route-contract's TanStack file parser does, so a rename of the job
    // detail route would fail this gate even if the fixture stayed green.
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

  it('omits the Impressum role when the page feature is disabled', async () => {
    const handler = createWellKnownRouteHandler(
      () => starterRoleTree,
      async () => false,
      CANONICAL_WORDS,
    );
    const response = await handler(
      new Request('https://board.example.com/.well-known/cavuno.json'),
    );
    const parsed = validateManifest(await response.json());
    if (!parsed.ok) throw new Error('Expected a valid well-known manifest');
    expect(parsed.manifest.roles.impressum).toBeUndefined();
  });

  it('publishes the Impressum role when the page feature is enabled', async () => {
    const handler = createWellKnownRouteHandler(
      () => starterRoleTree,
      async () => true,
      CANONICAL_WORDS,
    );
    const response = await handler(
      new Request('https://board.example.com/.well-known/cavuno.json'),
    );
    const parsed = validateManifest(await response.json());
    if (!parsed.ok) throw new Error('Expected a valid well-known manifest');
    expect(parsed.manifest.roles.impressum).toBe('/impressum');
  });

  async function rolesFor(words?: Readonly<Record<string, string>>) {
    const handler =
      words === undefined
        ? createWellKnownRouteHandler(() => starterRoleTree)
        : createWellKnownRouteHandler(
            () => starterRoleTree,
            () => true,
            words,
          );
    const response = await handler(
      new Request('https://board.example.com/.well-known/cavuno.json'),
    );
    const parsed = validateManifest(await response.json());
    if (!parsed.ok) throw new Error('Expected a valid well-known manifest');
    return parsed.manifest.roles;
  }

  it('publishes role templates in the board language URL words', async () => {
    const roles = await rolesFor(URL_WORDS.nl);
    expect(roles.jobDetail).toBe('/bedrijven/:companySlug/vacatures/:jobSlug');
    expect(roles.jobs).toBe('/vacatures');
    expect(roles.alertsManage).toBe('/vacaturemail/beheren');
    expect(roles.impressum).toBe('/impressum');
    expect(roles.home).toBe('/');
  });

  it('uses the compiled board language by default', async () => {
    const expected = new Map([
      ['nl', '/bedrijven/:companySlug/vacatures/:jobSlug'],
      ['fr', '/entreprises/:companySlug/emplois/:jobSlug'],
    ]);
    expect((await rolesFor()).jobDetail).toBe(
      expected.get(baseLocale) ?? '/companies/:companySlug/jobs/:jobSlug',
    );
  });
});
