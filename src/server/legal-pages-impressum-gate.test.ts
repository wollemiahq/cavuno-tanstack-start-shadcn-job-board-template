import { describe, expect, it } from 'vitest';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Structural pin for the Impressum feature gate (repo structural-test
 * doctrine — source-level, not RPC).
 *
 * `Footer.tsx` hides the /impressum link when `features.impressum` is off,
 * but the page itself used to render on a direct hit: the prose moved to
 * `src/content/legal/`, so no API 404 gated it any more and the route's
 * `isNotFound` catch became dead code. The gate now lives in the server fn
 * — a unit test of the loader would not fail if the handler stopped calling
 * it, so pin the call site.
 */
const legalPagesSource = readFileSync(
  join(import.meta.dirname, 'legal-pages.ts'),
  'utf8',
);
const impressumRouteSource = readFileSync(
  join(import.meta.dirname, '..', 'routes', 'impressum.tsx'),
  'utf8',
);

describe('getLegalPageView gates Impressum on features.impressum', () => {
  it('404s a disabled Impressum before building the view model', () => {
    expect(legalPagesSource).toContain(
      "data.type === 'impressum' && !boardContext.features.impressum",
    );
    expect(legalPagesSource).toContain('throw notFound()');
    // The gate must precede the view model, or a disabled board still
    // serves head meta + JSON-LD for a page it does not have.
    expect(
      legalPagesSource.indexOf('!boardContext.features.impressum'),
    ).toBeLessThan(legalPagesSource.indexOf('const page: LegalPageViewModel'));
  });

  it('leaves no dead isNotFound catch on the route claiming to do the gating', () => {
    expect(impressumRouteSource).not.toContain('isNotFound');
  });
});
