import type { LegalPageType } from '@cavuno/board';
import type { BreadcrumbsCopy } from '@cavuno/board/format';

export interface LegalPageMeta {
  path: string;
  /** Key into `boardCopy(...).breadcrumbs` — resolves the label at render time. */
  breadcrumbKey: keyof BreadcrumbsCopy;
  jsonLdType: 'AboutPage' | 'WebPage';
}

/**
 * Per-type metadata for the legal/about routes. Keyed by the SDK `LegalPageType`
 * (which is also the URL path), so each route file maps its URL straight to
 * `board.legal.retrieve(type)`.
 */
export const LEGAL_PAGES: Record<LegalPageType, LegalPageMeta> = {
  about: { path: '/about', breadcrumbKey: 'about', jsonLdType: 'AboutPage' },
  'privacy-policy': {
    path: '/privacy-policy',
    breadcrumbKey: 'privacyPolicy',
    jsonLdType: 'WebPage',
  },
  'terms-of-service': {
    path: '/terms-of-service',
    breadcrumbKey: 'termsOfService',
    jsonLdType: 'WebPage',
  },
  'cookie-policy': {
    path: '/cookie-policy',
    breadcrumbKey: 'cookiePolicy',
    jsonLdType: 'WebPage',
  },
  impressum: {
    path: '/impressum',
    breadcrumbKey: 'impressum',
    jsonLdType: 'WebPage',
  },
};

/** Strip the portable-HTML prose to a plain-text `<meta name="description">`. */
export function legalMetaDescription(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160);
}
