import { describe, expect, it, vi } from 'vitest';

import {
  localizeSitemapEntries,
  renderUrlsetWithAlternates,
} from './sitemap-alternates';

// A Dutch board with a French variant: unprefixed URLs are Dutch.
vi.mock('../paraglide/runtime', async (importOriginal) => {
  const runtime = await importOriginal<typeof import('../paraglide/runtime')>();
  const compiled = ['nl', 'fr'];
  return {
    ...runtime,
    baseLocale: 'nl',
    locales: compiled,
    getLocale: () => 'nl',
    isLocale: (tag: string) => compiled.includes(tag),
    localizeHref: (href: string, options?: { locale?: string }) => {
      const locale = options?.locale ?? 'nl';
      if (locale === 'nl') return href;
      return href === '/' ? `/${locale}` : `/${locale}${href}`;
    },
  };
});

const ORIGIN = 'https://board.example';

describe('sitemap URLs on a board with localized segments', () => {
  it('lists the localized URL as loc and x-default', () => {
    const xml = renderUrlsetWithAlternates(
      [`${ORIGIN}/jobs/locations/amsterdam`],
      ORIGIN,
    );
    expect(xml).toContain(`<loc>${ORIGIN}/vacatures/locaties/amsterdam</loc>`);
    expect(xml).toContain(
      `hreflang="x-default" href="${ORIGIN}/vacatures/locaties/amsterdam"`,
    );
    expect(xml).toContain(
      `hreflang="fr" href="${ORIGIN}/fr/emplois/locations/amsterdam"`,
    );
    expect(xml).not.toContain(`${ORIGIN}/jobs/`);
  });

  it('localizes on-origin entries of plain buckets and keeps others', () => {
    expect(
      localizeSitemapEntries(
        [
          `${ORIGIN}/companies/acme/jobs/designer`,
          {
            url: 'https://elsewhere.example/jobs/x',
            lastModified: '2026-01-01',
          },
        ],
        ORIGIN,
      ),
    ).toEqual([
      { url: `${ORIGIN}/bedrijven/acme/vacatures/designer` },
      { url: 'https://elsewhere.example/jobs/x', lastModified: '2026-01-01' },
    ]);
  });
});
