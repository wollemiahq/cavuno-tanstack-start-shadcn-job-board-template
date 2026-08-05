import type { ReactNode } from 'react';

/** App-owned legal page keys (also the URL path segments). */
export type LegalPageType =
  | 'about'
  | 'privacy-policy'
  | 'terms-of-service'
  | 'cookie-policy'
  | 'impressum';

/** Viewer chrome locales the legal scaffolds ship with. */
export type LegalLocale = 'en' | 'de' | 'fr';

/**
 * Application-owned legal/about page content.
 *
 * `title` + `description` are serializable (server head / JSON-LD).
 * `Body` is a real React component — never an HTML string — so the legal
 * view can compose elements without `dangerouslySetInnerHTML`.
 */
export type LegalPageContent = {
  title: string;
  /** Plain-text meta description + JSON-LD `description` (do not derive from JSX). */
  description: string;
  Body: () => ReactNode;
};

/**
 * Structured impressum legal-entity facts. Fill in before enabling impressum
 * on a board that needs them. Leave `null` (or both fields null) so the
 * impressum facts card does not render an empty box.
 *
 * OPERATOR: replace with your legal name and address when required.
 */
export type LegalEntityConfig = {
  legalName: string | null;
  address: string | null;
} | null;

/** Unset by default — impressum facts card stays hidden until filled in. */
export const legalEntity: LegalEntityConfig = null;
