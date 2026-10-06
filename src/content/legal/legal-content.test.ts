import { describe, expect, it } from 'vitest';

import { LEGAL_PAGES_CONTENT, resolveLegalContent } from './index';

import type { LegalLocale, LegalPageType } from './types';

const BUILT_IN_LOCALES = [
  'en',
  'de',
  'fr',
  'es',
  'pl',
  'nl',
] as const satisfies readonly LegalLocale[];

const PUBLISHED_PAGES = [
  'about',
  'privacy-policy',
  'terms-of-service',
  'cookie-policy',
] as const satisfies readonly LegalPageType[];

// Scaffold wording in the shipped languages. A real sample policy never
// tells the reader it is a placeholder or that its facts are examples.
const SCAFFOLD_WORDING =
  /placeholder|platzhalter|espace réservé|contenido de ejemplo|treść przykładowa|tijdelijke tekst|replace (this|the|every)|lorem ipsum|example\.com|example street|hrb 123456/i;

function tagNames(html: string): string[] {
  return Array.from(html.matchAll(/<\/?([a-z0-9]+)/gi), (match) =>
    match[0]!.toLowerCase(),
  );
}

describe('shipped legal content', () => {
  it.each(PUBLISHED_PAGES)(
    '%s has real text in every built-in locale',
    (type) => {
      const page = LEGAL_PAGES_CONTENT[type];
      expect(page.sourceLanguage).toBe('en');
      const english = page.locales.en!;
      for (const locale of BUILT_IN_LOCALES) {
        const content = page.locales[locale];
        expect(content, locale).toBeDefined();
        expect(content!.title.trim(), locale).not.toBe('');
        expect(content!.description.trim(), locale).not.toBe('');
        expect(content!.description, locale).not.toMatch(/[<>]/);
        expect(
          `${content!.title} ${content!.description} ${content!.html}`,
          locale,
        ).not.toMatch(SCAFFOLD_WORDING);
        // Same document structure as the source: nothing added or dropped.
        expect(tagNames(content!.html), locale).toEqual(tagNames(english.html));
        expect(content!.html.match(/{{board_name}}/g)?.length, locale).toBe(
          english.html.match(/{{board_name}}/g)?.length,
        );
      }
    },
  );

  it('ships no impressum, so the page stays unpublished', () => {
    expect(LEGAL_PAGES_CONTENT.impressum.locales).toEqual({});
    for (const locale of BUILT_IN_LOCALES) {
      expect(resolveLegalContent('impressum', locale)).toBeNull();
    }
  });

  it('falls back to the source language for a locale without text', () => {
    expect(resolveLegalContent('privacy-policy', 'nb')).toBe(
      LEGAL_PAGES_CONTENT['privacy-policy'].locales.en,
    );
    expect(resolveLegalContent('privacy-policy', 'de')).toBe(
      LEGAL_PAGES_CONTENT['privacy-policy'].locales.de,
    );
  });
});
