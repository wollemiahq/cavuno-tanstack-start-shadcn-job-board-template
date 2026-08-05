import type { LegalPageType } from '@/content/legal/types';

export type { LegalPageType };

export interface LegalPageMeta {
  path: string;
  /** Key into `breadcrumbsCopy(...)` — resolves the label at render time. */
  breadcrumbKey:
    | 'about'
    | 'privacyPolicy'
    | 'termsOfService'
    | 'cookiePolicy'
    | 'impressum';
  jsonLdType: 'AboutPage' | 'WebPage';
}

/**
 * Serializable page payload for LegalPageView. JSX bodies live in
 * `src/content/legal/` and are resolved by `type` — React elements are not
 * server-fn serializable.
 */
export type LegalPageViewModel = {
  type: LegalPageType;
  title: string;
  legalEntity: {
    legalName: string | null;
    address: string | null;
  } | null;
};

/**
 * Per-type metadata for the legal/about routes. Keyed by the SDK `LegalPageType`
 * (which is also the URL path). Prose lives in `src/content/legal/`; this table
 * only owns path, breadcrumb key, and JSON-LD `@type`.
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
