import { describe, expect, it } from 'vitest';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * R3 — handler-wiring pin for the shared-fixture mutation gate.
 * Pure unit tests of `rejectSharedDemoMutation` do not fail if a handler
 * stops calling it; this structural check pins both mutation server fns
 * to the gate (repo structural-test doctrine — source-level, not RPC).
 */
const previewSource = readFileSync(
  join(import.meta.dirname, 'preview.ts'),
  'utf8',
);

function handlerBody(exportName: string): string {
  const start = previewSource.indexOf(`export const ${exportName}`);
  expect(start, `${exportName} export missing`).toBeGreaterThanOrEqual(0);
  // Next top-level export after this one (or end of file).
  const next = previewSource.indexOf('\nexport const ', start + 1);
  return next === -1
    ? previewSource.slice(start)
    : previewSource.slice(start, next);
}

describe('preview mutation handlers wire rejectSharedDemoMutation (R3)', () => {
  it('updateSandboxFlags calls rejectSharedDemoMutation after capability', () => {
    const body = handlerBody('updateSandboxFlags');
    expect(body).toContain('rejectSharedDemoMutation');
    // Capability gate first, then private-shadow gate.
    expect(body.indexOf('canPreview')).toBeLessThan(
      body.indexOf('rejectSharedDemoMutation'),
    );
  });

  it('reseedSandbox calls rejectSharedDemoMutation after capability', () => {
    const body = handlerBody('reseedSandbox');
    expect(body).toContain('rejectSharedDemoMutation');
    expect(body.indexOf('canPreview')).toBeLessThan(
      body.indexOf('rejectSharedDemoMutation'),
    );
  });
});
