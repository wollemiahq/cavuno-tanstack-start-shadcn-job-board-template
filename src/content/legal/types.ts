/** App-owned legal page keys (also the URL path segments). */
export type LegalPageType =
  | 'about'
  | 'privacy-policy'
  | 'terms-of-service'
  | 'cookie-policy'
  | 'impressum';

/** Viewer chrome locales the starter ships legal text for. */
export type LegalLocale = 'en' | 'de' | 'fr' | 'es' | 'pl' | 'nl';

/**
 * One legal/about page in one language.
 *
 * `title` + `description` are plain text (head meta, JSON-LD). `html` is the
 * page body as an HTML string. It is data, so tools can read, translate and
 * write it without parsing code. `{{board_name}}` in any field is replaced
 * with the board name at request time; the body is sanitized before render
 * (`renderLegalHtml`).
 */
export type LegalPageContent = {
  title: string;
  description: string;
  html: string;
};

/**
 * A page module (`src/content/legal/<page>.json`).
 *
 * `sourceLanguage` is the language the page was written in. Every other
 * entry in `locales` is a translation of it. A locale with no entry falls back
 * to the source entry. A page with no entries at all is not published.
 */
export type LegalPageData = {
  sourceLanguage: string;
  locales: Partial<Record<string, LegalPageContent>>;
};

/**
 * Translations for one extra locale
 * (`src/content/legal/translations/<locale>.json`), keyed by page. An entry
 * here takes precedence over the page module's own entry for that locale.
 */
export type LegalTranslations = Partial<
  Record<LegalPageType, LegalPageContent>
>;

/**
 * Structured impressum legal-entity facts for a hand-run board. Leave `null`
 * (or both fields null) so the impressum facts card does not render an empty
 * box. Boards connected to Cavuno get the legal name from the board context.
 */
export type LegalEntityConfig = {
  legalName: string | null;
  address: string | null;
} | null;

/** Unset by default: the impressum facts card stays hidden until filled in. */
export const legalEntity: LegalEntityConfig = null;
