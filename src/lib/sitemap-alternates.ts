/**
 * Localized sitemap rendering. The SDK's `renderUrlset` is hosted-parity
 * and knows nothing about this template's /de/ /fr/ URL variants — without
 * alternates the sitemap gives crawlers no discovery path to the localized
 * clusters the hreflang tags declare.
 *
 * Only SELF-CANONICAL buckets get alternates: hreflang members must be
 * self-canonical, and `jobs-details` canonicalizes to the hosted board
 * while `companies`/`blog` entries may carry an external
 * publicUrl/canonicalUrl we can't see from here — those keep the SDK's
 * plain rendering.
 */
import { xmlEscape } from '@cavuno/board/sitemap';

import { locales } from '../paraglide/runtime';
import { localizePath } from './localized-path';
import { publicLocales } from './public-locales';

import type { SitemapBucket, SitemapUrlEntry } from '@cavuno/board/sitemap';

const SITEMAP_NS = 'http://www.sitemaps.org/schemas/sitemap/0.9';
const XHTML_NS = 'http://www.w3.org/1999/xhtml';

export const LOCALIZED_BUCKETS: readonly SitemapBucket[] = [
  'marketing',
  'jobs-categories',
  'jobs-skills',
  'jobs-locations',
  'salaries',
];

function alternateLinks(origin: string, path: string): string {
  let xml = '';
  // QA builds compile pseudo-locales into `locales`; never advertise them.
  for (const locale of publicLocales(locales)) {
    const href = `${origin}${localizePath(path, { locale })}`;
    xml += `<xhtml:link rel="alternate" hreflang="${locale}" href="${xmlEscape(href)}"/>\n`;
  }
  xml += `<xhtml:link rel="alternate" hreflang="x-default" href="${xmlEscape(`${origin}${path}`)}"/>\n`;
  return xml;
}

/**
 * `renderUrlset` with an `xhtml:link` alternate block per URL (Google's
 * documented sitemap-hreflang format). Mirrors the SDK renderer's XML
 * shape; entries outside `origin` pass through without alternates.
 */
export function renderUrlsetWithAlternates(
  entries: readonly (string | SitemapUrlEntry)[],
  origin: string,
): string {
  const normalized = entries.map((entry) =>
    typeof entry === 'string' ? { url: entry } : entry,
  );
  let xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    `<urlset xmlns="${SITEMAP_NS}" xmlns:xhtml="${XHTML_NS}">\n`;
  for (const entry of normalized) {
    xml += '<url>\n';
    xml += `<loc>${xmlEscape(entry.url)}</loc>\n`;
    if (entry.url.startsWith(`${origin}/`) || entry.url === origin) {
      const path = entry.url.slice(origin.length) || '/';
      xml += alternateLinks(origin, path);
    }
    if (entry.lastModified) {
      const serialized =
        entry.lastModified instanceof Date
          ? entry.lastModified.toISOString()
          : entry.lastModified;
      xml += `<lastmod>${xmlEscape(serialized)}</lastmod>\n`;
    }
    xml += '</url>\n';
  }
  xml += '</urlset>\n';
  return xml;
}
