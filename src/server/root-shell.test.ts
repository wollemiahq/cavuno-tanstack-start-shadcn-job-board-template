import { describe, expect, it } from 'vitest';

import { readFileSync } from 'node:fs';

/**
 * Public documents stay viewer-anonymous (X-Cavuno-Doc-Vary). Consent is a
 * client island after paint — the SSR loader must not read cookies or
 * emit consentChoice, or the edge cache cannot reuse one HTML copy.
 */
const SOURCE = readFileSync(
  new URL('./root-shell.ts', import.meta.url),
  'utf8',
);

function handlerBody(name: string): string {
  const start = SOURCE.indexOf(`export const ${name}`);
  expect(start, `${name} was renamed — update this guard`).toBeGreaterThan(-1);
  const next = SOURCE.indexOf('export const', start + 1);
  const end = next === -1 ? SOURCE.length : next;
  return SOURCE.slice(start, end);
}

describe('getRootShellData stays viewer-anonymous', () => {
  it('does not read cookies, session, or consent on the public document', () => {
    const body = handlerBody('getRootShellData');
    expect(body).not.toContain('consentChoice');
    expect(body).not.toContain('cookie');
    expect(body).not.toContain('getSessionUser');
    expect(body).not.toContain('CookieConsent');
  });

  it('returns only origin, board, seo, and offerGate', () => {
    const body = handlerBody('getRootShellData');
    expect(body).toContain('origin:');
    expect(body).toContain('board,');
    expect(body).toContain('seo,');
    expect(body).toContain('offerGate,');
    expect(body).toContain('getFreshBoardContext');
    expect(body).toContain('getBoardSeo');
    expect(body).toContain('getEmployerOfferGate');
  });

  it('defers session, employer, paywall, and preview to the client island', () => {
    const body = handlerBody('getRootSessionShellData');
    expect(body).toContain('getSessionUser');
    expect(body).toContain('listCompanies');
    expect(body).toContain('resolvePreviewStateForViewer');
    expect(body).toContain('getAccessGrant');
  });
});
