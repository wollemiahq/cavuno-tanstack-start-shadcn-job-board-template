import { describe, expect, it } from 'vitest';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The Stripe return routes must sit directly under the root route.
 *
 * `post.tsx` is the wizard and renders no `<Outlet />`, so a `post.success`
 * child would never paint; and `employer.$slug.jobs.tsx` would become the
 * layout parent of the `/jobs/new` cancel alias, whose beforeLoad it would
 * pre-empt. The file names (`post_.success`, `employer.$slug.jobs.index`)
 * carry that; this pins what the generated tree actually resolved.
 */
const tree = readFileSync(
  join(import.meta.dirname, '..', 'routeTree.gen.ts'),
  'utf8',
);

const ROOT_PARENTED = [
  'PostSuccessRouteImport',
  'PostCheckoutCanceledRouteImport',
  'EmployerSlugJobsIndexRouteImport',
  'EmployerSlugJobsNewRouteImport',
];

describe('Stripe return routes are not nested', () => {
  it.each(ROOT_PARENTED)('%s is parented to the root route', (name) => {
    const block = tree.match(
      new RegExp(
        `preLoaderRoute: typeof ${name}\\n\\s+parentRoute: typeof (\\w+)`,
      ),
    );
    expect(block?.[1]).toBe('rootRouteImport');
  });
});
