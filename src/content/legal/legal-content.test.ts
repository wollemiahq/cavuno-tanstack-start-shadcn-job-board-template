import { describe, expect, it } from 'vitest';

import { impressumAvailable } from './impressum-availability';
import { resolveLegalContent } from './index';

import type { LegalLocale, LegalPageType } from './types';

// Holds for any valid legal content, shipped or operator-written, so a board
// that edits or translates its pages keeps passing.

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

// Scaffold wording in the shipped languages. A real policy never tells the
// reader it is a placeholder or that its facts are examples.
const SCAFFOLD_WORDING =
  /placeholder|platzhalter|espace réservé|contenido de ejemplo|treść przykładowa|tijdelijke tekst|replace (this|the|every)|lorem ipsum|example\.com|example street|hrb 123456/i;

describe('legal content', () => {
  it.each(PUBLISHED_PAGES)(
    '%s has real text in every built-in locale',
    (type) => {
      for (const locale of BUILT_IN_LOCALES) {
        const content = resolveLegalContent(type, locale);
        expect(content, locale).not.toBeNull();
        expect(content!.title.trim(), locale).not.toBe('');
        expect(content!.description.trim(), locale).not.toBe('');
        expect(content!.description, locale).not.toMatch(/[<>]/);
        expect(
          `${content!.title} ${content!.description} ${content!.html}`,
          locale,
        ).not.toMatch(SCAFFOLD_WORDING);
      }
    },
  );

  it('publishes the impressum exactly when it has content', () => {
    const hasContent = resolveLegalContent('impressum', 'en') !== null;
    expect(impressumAvailable({ impressum: true })).toBe(hasContent);
    expect(impressumAvailable({ impressum: false })).toBe(false);
    for (const locale of BUILT_IN_LOCALES) {
      expect(resolveLegalContent('impressum', locale) !== null, locale).toBe(
        hasContent,
      );
    }
  });
});
