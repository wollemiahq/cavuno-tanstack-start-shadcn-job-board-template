/**
 * Localized route slugs — /fr/emplois instead of /fr/jobs — as a thin,
 * bidirectional segment translation layered on Paraglide's URL strategy.
 *
 * Why not Paraglide urlPatterns: this repo compiles the runtime BOTH via
 * the vite plugin and the gen:paraglide CLI, and the CLI cannot express
 * urlPatterns — the two outputs would silently diverge. A first-segment
 * map at the same seams (router rewrite, canonicals, alternates, the
 * language switcher) achieves the localized URLs without forking the
 * runtime.
 *
 * Only the SECTION segment translates; deeper segments stay canonical
 * (slugs are board content). A canonical segment under a prefix
 * (/fr/jobs) does not serve — the router rewrite round-trip 307s it to
 * /fr/emplois (query preserved), so each variant has exactly one URL.
 *
 * Slug maps for de/fr stay here even while those locales are dormant
 * (not in project.inlang/settings.json). Enabling one is `pnpm locale:add`.
 */
import { isLocale, localizeHref } from '../paraglide/runtime';

const SECTION_TRANSLATIONS: Record<string, Record<string, string>> = {
  fr: {
    jobs: 'emplois',
    companies: 'entreprises',
    salaries: 'salaires',
    talent: 'talents',
  },
  de: {
    // 'jobs' stays: the anglicism is standard German job-board usage.
    companies: 'unternehmen',
    salaries: 'gehaelter',
    talent: 'talente',
  },
};

const TRANSLATED_PREFIX = Object.keys(SECTION_TRANSLATIONS).join('|');
const PREFIXED_SECTION = new RegExp(`^/(${TRANSLATED_PREFIX})/([^/?#]+)(.*)$`);

const LOCALIZED_TO_CANONICAL: Record<
  string,
  Record<string, string>
> = Object.fromEntries(
  Object.entries(SECTION_TRANSLATIONS).map(([locale, map]) => [
    locale,
    Object.fromEntries(
      Object.entries(map).map(([canonical, localized]) => [
        localized,
        canonical,
      ]),
    ),
  ]),
);

function splitPath(path: string): {
  pathname: string;
  search: string;
  hash: string;
} {
  const hashIndex = path.indexOf('#');
  const hash = hashIndex >= 0 ? path.slice(hashIndex) : '';
  const noHash = hashIndex >= 0 ? path.slice(0, hashIndex) : path;
  const qIndex = noHash.indexOf('?');
  const search = qIndex >= 0 ? noHash.slice(qIndex) : '';
  const pathname = qIndex >= 0 ? noHash.slice(0, qIndex) : noHash;
  return { pathname, search, hash };
}

/** Prefix a path for a locale that is not (yet) in the compiled runtime. */
function prefixUncompiled(path: string, locale: string): string {
  const { pathname, search, hash } = splitPath(path);
  const prefixed = pathname === '/' ? `/${locale}` : `/${locale}${pathname}`;
  return `${prefixed}${search}${hash}`;
}

function prefixHref(path: string, locale: string | undefined): string {
  if (locale === undefined) return localizeHref(path);
  if (isLocale(locale)) return localizeHref(path, { locale });
  return prefixUncompiled(path, locale);
}

/** Locale-prefixed AND slug-localized href for a canonical path. */
export function localizePath(
  path: string,
  options?: { locale?: string },
): string {
  const prefixed = prefixHref(path, options?.locale);
  const match = prefixed.match(PREFIXED_SECTION);
  if (!match) return prefixed;
  const [, locale, section, rest] = match;
  const localized = SECTION_TRANSLATIONS[locale!]?.[section!];
  return localized ? `/${locale}/${localized}${rest}` : prefixed;
}

/** Forward segment translation for an ALREADY locale-prefixed pathname
 * (the router's output rewrite localizes first, then translates). */
export function localizeSegments(pathname: string): string {
  const match = pathname.match(PREFIXED_SECTION);
  if (!match) return pathname;
  const [, locale, section, rest] = match;
  const localized = SECTION_TRANSLATIONS[locale!]?.[section!];
  return localized ? `/${locale}/${localized}${rest}` : pathname;
}

/** Inverse: rewrite a localized section segment back to its canonical name
 * (keeps the locale prefix — Paraglide's deLocalizeUrl strips that). */
export function delocalizeSegments(pathname: string): string {
  const match = pathname.match(PREFIXED_SECTION);
  if (!match) return pathname;
  const [, locale, section, rest] = match;
  const canonical = LOCALIZED_TO_CANONICAL[locale!]?.[section!];
  return canonical ? `/${locale}/${canonical}${rest}` : pathname;
}
