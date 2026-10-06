import { describe, expect, it } from 'vitest';

import { resolvePageContent, translationLocale } from './resolve';

const entry = (title: string) => ({ title, description: title, html: '' });
const EN = entry('English');
const DE = entry('Deutsch');

describe('resolvePageContent', () => {
  it('prefers a translation, then the locale entry, then the source', () => {
    const page = { sourceLanguage: 'en', locales: { en: EN, de: DE } };
    expect(resolvePageContent(page, { de: entry('T') }, 'de')?.title).toBe('T');
    expect(resolvePageContent(page, {}, 'de')).toBe(DE);
    expect(resolvePageContent(page, {}, 'fr')).toBe(EN);
  });

  it('serves a page written in another language than its source', () => {
    const page = { sourceLanguage: 'en', locales: { de: DE } };
    expect(resolvePageContent(page, {}, 'en')).toBe(DE);
    expect(resolvePageContent(page, {}, 'fr')).toBe(DE);
  });

  it('serves a page that exists only in translations/<locale>.json', () => {
    const page = { sourceLanguage: 'en', locales: {} };
    expect(resolvePageContent(page, { de: DE }, 'en')).toBe(DE);
  });

  it('publishes nothing for a page with no content', () => {
    const page = { sourceLanguage: 'en', locales: {} };
    expect(resolvePageContent(page, { de: undefined }, 'en')).toBeNull();
  });
});

describe('translationLocale', () => {
  it('reads the locale from the file name', () => {
    expect(translationLocale('./translations/pt-BR.json')).toBe('pt-BR');
  });
});
