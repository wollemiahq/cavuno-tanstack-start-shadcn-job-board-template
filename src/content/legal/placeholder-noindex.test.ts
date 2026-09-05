import { describe, expect, it } from 'vitest';

import { LEGAL_PLACEHOLDER_PAGES, isLegalPlaceholder } from './index';

import type { LegalPageType } from './types';
import { Route as AboutRoute } from '@/routes/about';
import { Route as CookieRoute } from '@/routes/cookie-policy';
import { Route as ImpressumRoute } from '@/routes/impressum';
import { Route as PrivacyRoute } from '@/routes/privacy-policy';
import { Route as TermsRoute } from '@/routes/terms-of-service';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const LEGAL_ROUTES = [
  ['/about', AboutRoute],
  ['/privacy-policy', PrivacyRoute],
  ['/terms-of-service', TermsRoute],
  ['/cookie-policy', CookieRoute],
  ['/impressum', ImpressumRoute],
] as const;

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
 * `<LegalPlaceholderCallout />` in the page's own source file. Each file
 * carries one callout per locale block, and a board serves only the locales
 * in `project.inlang/settings.json` (`en` by default) — so the check is
 * one-directional: a page may be un-listed while callouts remain in locales
 * it does not serve, but a page with no callout left anywhere must not stay
 * listed.
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
    '%s is not still listed once every callout is gone',
    (type, file) => {
      if (!rendersCallout(file)) expect(isLegalPlaceholder(type)).toBe(false);
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
  });

  it.each(LEGAL_ROUTES)(
    '%s spreads the server head, so the robots meta reaches the document',
    (_path, route) => {
      // Same string-level check as -private-route-noindex.test.ts: the head
      // is a function of loader data, so assert the spread it is built from.
      expect(route.options.head?.toString()).toContain('...loaderData.head');
    },
  );
});
