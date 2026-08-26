import { describe, expect, it } from 'vitest';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The public root loader must stay viewer-anonymous: consent is resolved
 * client-side so edge-cached HTML is byte-identical for consented and
 * undecided visitors.
 */
const source = readFileSync(join(import.meta.dirname, 'root-shell.ts'), 'utf8');

function handlerBody(exportName: string): string {
  const start = source.indexOf(`export const ${exportName}`);
  expect(start, `${exportName} export missing`).toBeGreaterThanOrEqual(0);
  const next = source.indexOf('\nexport const ', start + 1);
  return next === -1 ? source.slice(start) : source.slice(start, next);
}

describe('getRootShellData', () => {
  it('payload has no consentChoice and the handler performs no cookie read', () => {
    const body = handlerBody('getRootShellData');
    expect(body).not.toContain('consentChoice');
    expect(body).not.toContain('parseCookieConsent');
    expect(body).not.toContain('getRequestHeader');
    expect(source).not.toContain("from '../lib/cookie-consent'");
  });
});
