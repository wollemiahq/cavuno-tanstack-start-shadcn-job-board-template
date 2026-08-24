import { describe, expect, it } from 'vitest';

import { readFileSync } from 'node:fs';

/**
 * `shellComponent` renders BEFORE loaders resolve — that is the whole
 * point of it, and why the document can flush on the first byte while
 * `getRootShellData`'s public fan-out is still in flight.
 *
 * So `Route.useLoaderData()` inside `RootDocument` is always `undefined`.
 * Dev tolerates it; a production build throws
 *
 *   TypeError: Cannot destructure property 'origin' of
 *   'Route.useLoaderData(...)' as it is undefined
 *
 * out of the ROOT, so every route 500s while the dev server looks
 * perfectly healthy. That divergence is what makes this worth pinning:
 * nothing in local development tells you it is broken.
 *
 * Anything the shell needs belongs in route context (`beforeLoad`), which
 * is resolved by then — see `requestOrigin`.
 */
const ROOT_SOURCE = readFileSync(
  new URL('./__root.tsx', import.meta.url),
  'utf8',
);

function shellComponentSource(): string {
  const start = ROOT_SOURCE.indexOf('function RootDocument');
  expect(start, 'RootDocument was renamed — update this guard').toBeGreaterThan(
    -1,
  );
  return ROOT_SOURCE.slice(start);
}

describe('root shell contract', () => {
  it('the shell never reads loader data', () => {
    expect(shellComponentSource()).not.toContain('useLoaderData');
  });

  it('the shell takes origin from route context instead', () => {
    expect(shellComponentSource()).toContain('Route.useRouteContext()');
  });

  it('origin is provided by beforeLoad, so it costs no round trip', () => {
    expect(ROOT_SOURCE).toContain('beforeLoad: () => ({ origin:');
  });

  it('does not mount messaging polling before email verification', () => {
    expect(ROOT_SOURCE).toContain('enabled={user.emailVerified}');
    expect(ROOT_SOURCE).toMatch(
      /user &&\s*user\.emailVerified &&\s*board\.features\.messaging/,
    );
  });
});
