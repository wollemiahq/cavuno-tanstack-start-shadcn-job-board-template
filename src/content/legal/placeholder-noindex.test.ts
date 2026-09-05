import { describe, expect, it } from 'vitest';

import { LEGAL_PLACEHOLDER_PAGES, isLegalPlaceholder } from './index';

import type { LegalPageType } from './types';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Keeps the noindex registry honest.
 *
 * The starter ships five legal/about pages whose bodies say, in the operator's
 * own footer and in Google's index, "Do not ship it as a real policy". The fix
 * is `robots: noindex` while that callout is present — but a hand-maintained
 * list drifts in the dangerous direction BOTH ways: forget to add a page and it
 * gets indexed as scaffolding; forget to remove one and the operator's real,
 * counsel-reviewed policy stays out of the index forever.
 *
 * So the list is checked against the thing an operator actually deletes: the
 * `<LegalPlaceholderCallout />` in the page's own source file.
 */
const CONTENT_FILES: ReadonlyArray<readonly [LegalPageType, string]> = [
  ['about', 'about.tsx'],
  ['privacy-policy', 'privacy-policy.tsx'],
  ['terms-of-service', 'terms-of-service.tsx'],
  ['cookie-policy', 'cookie-policy.tsx'],
  ['impressum', 'impressum.tsx'],
];

function rendersCallout(file: string): boolean {
  return readFileSync(join(import.meta.dirname, file), 'utf8').includes(
    '<LegalPlaceholderCallout />',
  );
}

describe('legal placeholder noindex registry', () => {
  it.each(CONTENT_FILES)(
    '%s is listed as a placeholder exactly while its callout is present',
    (type, file) => {
      expect(isLegalPlaceholder(type)).toBe(rendersCallout(file));
    },
  );

  it('lists no page that has no content file', () => {
    const known = new Set(CONTENT_FILES.map(([type]) => type));
    for (const type of LEGAL_PLACEHOLDER_PAGES) {
      expect(known.has(type)).toBe(true);
    }
  });

  it('emits noindex from the one place every legal route builds its head', () => {
    const source = readFileSync(
      join(import.meta.dirname, '..', '..', 'server', 'legal-pages.ts'),
      'utf8',
    );
    expect(source).toContain('isLegalPlaceholder(data.type)');
    expect(source).toContain("{ name: 'robots', content: 'noindex' }");
    // Ahead of the canonical link, i.e. inside the head the routes spread —
    // not appended somewhere a route can forget to pass through.
    expect(source.indexOf('isLegalPlaceholder(data.type)')).toBeLessThan(
      source.indexOf("rel: 'canonical'"),
    );
  });
});
