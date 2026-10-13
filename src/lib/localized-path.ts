/**
 * Localized URL segments — /vacatures/locaties/amsterdam on a Dutch board,
 * /fr/emplois on its French variant — as a bidirectional translation layered
 * on Paraglide's URL strategy. The file routes stay canonical (English);
 * only the URLs people and crawlers see are translated.
 *
 * How a path translates: it is matched against the canonical route
 * templates (src/lib/route-templates.ts) the way the router ranks them —
 * static beats param beats splat, left to right — and every STATIC segment
 * of the winning template is swapped for the locale's word. Param segments
 * are board content and never translate: a company whose slug is "jobs"
 * stays /bedrijven/jobs. Positional matching is what makes that safe; a
 * plain word-for-word swap could not tell the two apart.
 *
 * Which locale: the base locale (unprefixed paths) and every prefixed
 * locale use their own word list from src/url-words.json. A locale without
 * a list keeps canonical URLs, so an English board, or any language not in
 * that file, is unchanged.
 *
 * Input accepts both forms at each static position (the localized word or
 * the canonical one), so old canonical links still resolve; the server
 * entry 308s them to the localized URL (src/lib/localized-url-redirect.ts).
 *
 * Machine paths — APIs, server functions, feeds, sitemaps, OG images,
 * embeds and other fixed contracts — never translate (MACHINE_*).
 *
 * Why not Paraglide urlPatterns: this repo compiles the runtime BOTH via the
 * vite plugin and the gen:paraglide CLI, and the CLI cannot express
 * urlPatterns — the two outputs would silently diverge.
 *
 * Retired words: when a word is renamed, the old one goes in
 * src/url-words-previous.json under the same locale and canonical segment.
 * Input accepts it at that segment's positions, ranked below the current
 * and canonical words but above params, so an old word is never read as a
 * slug and a retired word that another segment now uses loses to it.
 * Output always uses the current word, so the server entry 308s an old URL
 * straight to the current one, however many renames ago it was.
 *
 * The well-known route manifest publishes role templates in the base
 * locale's words (localizeRouteTemplate), the same mapping the platform
 * applies when it reads src/url-words.json.
 */
import {
  baseLocale,
  getLocale,
  isLocale,
  localizeHref,
} from '../paraglide/runtime';
import { ROUTE_TEMPLATES } from './route-templates';
import { BOARD_PREVIOUS_URL_WORDS, BOARD_URL_WORDS } from './url-words';

import type { PreviousUrlWords, UrlWords } from './url-words';

type SplitPath = {
  pathname: string;
  search: string;
  hash: string;
};

/**
 * Paths that are contracts with machines (crawlers, feed readers, the
 * platform, embeds, server-function RPCs): never translated and never
 * redirected. First path segment, after any locale prefix; anything
 * starting with "sitemap" also counts.
 */
export const MACHINE_FIRST_SEGMENTS: ReadonlySet<string> = new Set([
  'api',
  '_serverFn',
  'go',
  '.well-known',
  'embed',
  'p',
  'apply',
  'coming-soon-gate',
  'robots.txt',
  'ads.txt',
  'indexnow-key.txt',
  'site.webmanifest',
]);

/** Machine routes deeper in the tree: feeds and OG images. */
export const MACHINE_TEMPLATES: readonly string[] = [
  '/jobs/rss.xml',
  '/blog/rss.xml',
  '/blog/og/$',
  '/blog/$postSlug/og',
  '/companies/$companySlug/jobs/$jobSlug/og',
];

type TemplateSegment =
  | { kind: 'static'; word: string }
  | { kind: 'param' }
  | { kind: 'splat' };

type Template = readonly TemplateSegment[];

function parseTemplate(template: string): Template {
  return template
    .split('/')
    .filter(Boolean)
    .map((part): TemplateSegment => {
      if (part === '$') return { kind: 'splat' };
      if (part.includes('$')) return { kind: 'param' };
      return { kind: 'static', word: part };
    });
}

/** Per-position rank: a current (or canonical) static word beats a
 * retired one, which beats a param, which beats a splat. */
const RANK = { static: 3, retired: 2, param: 1, splat: 0 } as const;

/** Rank of `segment` at a static position for canonical `word`, or null
 * if the position does not accept it. */
type StaticMatch = (word: string, segment: string) => number | null;

/** Router-style rank of `template` for `segments`, or null if it does not
 * match. `accepts(word, segment)` decides a static position. */
function matchRank(
  template: Template,
  segments: readonly string[],
  accepts: StaticMatch,
): number[] | null {
  const rank: number[] = [];
  for (let index = 0; index < template.length; index += 1) {
    const part = template[index]!;
    if (part.kind === 'splat') {
      rank.push(RANK.splat);
      return rank;
    }
    const segment = segments[index];
    if (segment === undefined) return null;
    if (part.kind === 'param') {
      rank.push(RANK.param);
      continue;
    }
    const staticRank = accepts(part.word, segment);
    if (staticRank === null) return null;
    rank.push(staticRank);
  }
  return template.length === segments.length ? rank : null;
}

function outranks(a: readonly number[], b: readonly number[]): boolean {
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const left = a[index] ?? -1;
    const right = b[index] ?? -1;
    if (left !== right) return left > right;
  }
  return false;
}

function bestTemplate(
  templates: readonly Template[],
  segments: readonly string[],
  accepts: StaticMatch,
): Template | null {
  let best: Template | null = null;
  let bestRank: number[] | null = null;
  for (const template of templates) {
    const rank = matchRank(template, segments, accepts);
    if (rank && (!bestRank || outranks(rank, bestRank))) {
      best = template;
      bestRank = rank;
    }
  }
  return best;
}

const ROUTES: readonly Template[] = ROUTE_TEMPLATES.map(parseTemplate);
const MACHINE_ROUTES: readonly Template[] =
  MACHINE_TEMPLATES.map(parseTemplate);

/** One locale's lookup maps: canonical segment → current word, and
 * canonical segment → its retired words. */
type LocaleWords = {
  current: ReadonlyMap<string, string>;
  retired: ReadonlyMap<string, ReadonlySet<string>>;
};

/** Settled per-file lookup maps (no I/O, safe to keep). */
const WORD_MAPS = new WeakMap<
  UrlWords,
  ReadonlyMap<string, ReadonlyMap<string, string>>
>();
const RETIRED_MAPS = new WeakMap<
  PreviousUrlWords,
  ReadonlyMap<string, ReadonlyMap<string, ReadonlySet<string>>>
>();

const NO_RETIRED_WORDS: ReadonlyMap<string, ReadonlySet<string>> = new Map();

function localeWords(
  words: UrlWords,
  previousWords: PreviousUrlWords,
  locale: string,
): LocaleWords | undefined {
  let maps = WORD_MAPS.get(words);
  if (!maps) {
    maps = new Map(
      Object.entries(words).map(([tag, entries]) => [
        tag,
        new Map(Object.entries(entries)),
      ]),
    );
    WORD_MAPS.set(words, maps);
  }
  const current = maps.get(locale);
  if (!current) return undefined;
  let retiredMaps = RETIRED_MAPS.get(previousWords);
  if (!retiredMaps) {
    retiredMaps = new Map(
      Object.entries(previousWords).map(([tag, entries]) => [
        tag,
        new Map(
          Object.entries(entries).map(([canonical, retired]) => [
            canonical,
            new Set(retired),
          ]),
        ),
      ]),
    );
    RETIRED_MAPS.set(previousWords, retiredMaps);
  }
  return { current, retired: retiredMaps.get(locale) ?? NO_RETIRED_WORDS };
}

const exactWord: StaticMatch = (word, segment) =>
  word === segment ? RANK.static : null;

function isMachineSegments(segments: readonly string[]): boolean {
  const first = segments[0];
  if (first === undefined) return false;
  if (MACHINE_FIRST_SEGMENTS.has(first) || first.startsWith('sitemap')) {
    return true;
  }
  return bestTemplate(MACHINE_ROUTES, segments, exactWord) !== null;
}

/**
 * Translate an unprefixed pathname's static segments into `locale`'s words
 * ('localized') or back to the canonical words ('canonical'). Either form
 * is accepted on input, so both directions are idempotent.
 */
function translatePathname(
  pathname: string,
  words: LocaleWords | undefined,
  to: 'localized' | 'canonical',
): string {
  if (!words || !pathname.startsWith('/') || pathname === '/') {
    return pathname;
  }
  const trailingSlash = pathname.endsWith('/');
  const segments = pathname.slice(1, trailingSlash ? -1 : undefined).split('/');
  if (isMachineSegments(segments)) return pathname;
  const { current, retired } = words;
  const template = bestTemplate(ROUTES, segments, (word, segment) => {
    if (segment === word || segment === current.get(word)) return RANK.static;
    return retired.get(word)?.has(segment) ? RANK.retired : null;
  });
  if (!template) return pathname;
  const translated = segments.map((segment, index) => {
    const part = template[index];
    if (part?.kind !== 'static') return segment;
    return to === 'localized'
      ? (current.get(part.word) ?? part.word)
      : part.word;
  });
  return `/${translated.join('/')}${trailingSlash ? '/' : ''}`;
}

/** The locale routing a pathname is read with: which tags are locale
 * prefixes, which locale owns unprefixed paths, each locale's URL words
 * and its retired words (none when omitted). Defaults to the compiled
 * Paraglide runtime and the board's word files; tests pass another
 * board's setup. */
export type LocaleRouting = {
  baseLocale: string;
  isLocale: (tag: string) => boolean;
  words: UrlWords;
  previousWords?: PreviousUrlWords;
};

const RUNTIME_ROUTING: LocaleRouting = {
  baseLocale,
  isLocale,
  words: BOARD_URL_WORDS,
  previousWords: BOARD_PREVIOUS_URL_WORDS,
};

const NO_PREVIOUS_WORDS: PreviousUrlWords = {};

function routingWords(
  routing: LocaleRouting,
  locale: string,
): LocaleWords | undefined {
  return localeWords(
    routing.words,
    routing.previousWords ?? NO_PREVIOUS_WORDS,
    locale,
  );
}

function splitPath(path: string): SplitPath {
  const hashIndex = path.indexOf('#');
  const hash = hashIndex >= 0 ? path.slice(hashIndex) : '';
  const noHash = hashIndex >= 0 ? path.slice(0, hashIndex) : path;
  const qIndex = noHash.indexOf('?');
  const search = qIndex >= 0 ? noHash.slice(qIndex) : '';
  const pathname = qIndex >= 0 ? noHash.slice(0, qIndex) : noHash;
  return { pathname, search, hash };
}

/** Split a pathname into its locale prefix (compiled locales only, so a
 * slug never counts as one) and the rest. */
type LocalePrefixSplit = {
  /** "/fr", or "" for an unprefixed (board-language) path. */
  prefix: string;
  locale: string;
  rest: string;
};

function splitLocalePrefix(
  pathname: string,
  routing: LocaleRouting,
): LocalePrefixSplit {
  const first = pathname.split('/')[1];
  if (first && routing.isLocale(first)) {
    const prefix = `/${first}`;
    return { prefix, locale: first, rest: pathname.slice(prefix.length) };
  }
  return { prefix: '', locale: routing.baseLocale, rest: pathname };
}

function translateHref(
  path: string,
  to: 'localized' | 'canonical',
  routing: LocaleRouting,
): string {
  const { pathname, search, hash } = splitPath(path);
  const { prefix, locale, rest } = splitLocalePrefix(pathname, routing);
  const words = routingWords(routing, locale);
  return `${prefix}${translatePathname(rest, words, to)}${search}${hash}`;
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

/** True for paths that never translate or redirect (see MACHINE_*). */
export function isMachinePath(
  path: string,
  routing: LocaleRouting = RUNTIME_ROUTING,
): boolean {
  const { rest } = splitLocalePrefix(splitPath(path).pathname, routing);
  return isMachineSegments(rest.split('/').filter(Boolean));
}

/** Remove a compiled locale's prefix (segments stay as they are). */
export function stripLocalePrefix(
  pathname: string,
  routing: LocaleRouting = RUNTIME_ROUTING,
): string {
  const { pathname: path } = splitPath(pathname);
  const { prefix, rest } = splitLocalePrefix(path, routing);
  if (!prefix) return path;
  return rest || '/';
}

/** Locale-prefixed AND segment-localized href for a canonical path. An
 * already localized path comes back unchanged. */
export function localizePath(
  path: string,
  options?: { locale?: string },
): string {
  const locale = options?.locale ?? getLocale();
  const { pathname, search, hash } = splitPath(
    prefixHref(path, options?.locale),
  );
  const prefix = `/${locale}`;
  const prefixed =
    locale !== baseLocale &&
    (pathname === prefix || pathname.startsWith(`${prefix}/`));
  const rest = prefixed ? pathname.slice(prefix.length) : pathname;
  const translated = translatePathname(
    rest,
    routingWords(RUNTIME_ROUTING, locale),
    'localized',
  );
  return `${prefixed ? prefix : ''}${translated}${search}${hash}`;
}

/** Forward translation for a pathname that already carries its locale
 * prefix, if any (the router's output rewrite localizes first, then
 * translates). Query and hash pass through. */
export function localizeSegments(
  pathname: string,
  routing: LocaleRouting = RUNTIME_ROUTING,
): string {
  return translateHref(pathname, 'localized', routing);
}

/** Inverse: localized static segments back to canonical words. Keeps the
 * locale prefix — Paraglide's deLocalizeUrl strips that. */
export function delocalizeSegments(
  pathname: string,
  routing: LocaleRouting = RUNTIME_ROUTING,
): string {
  return translateHref(pathname, 'canonical', routing);
}

/** The canonical route path behind a public path: canonical segments, no
 * locale prefix, no query or hash. For route checks such as "is this an
 * employer page". */
export function canonicalPathname(
  path: string,
  routing: LocaleRouting = RUNTIME_ROUTING,
): string {
  return stripLocalePrefix(delocalizeSegments(path, routing), routing);
}

/** localizePath for a same-site path ("/jobs?q=x"); absolute, protocol-
 * relative and non-path hrefs (mailto:, #top) pass through. For raw <a>
 * hrefs and operator-configured links, which skip the router rewrite.
 * The board-language form ("/vacatures") is accepted too, so it also
 * resolves on prefixed variants. Machine paths and files pass through. */
export function localizeHrefIfInternal(href: string): string {
  if (!href.startsWith('/') || href.startsWith('//')) return href;
  // Machine paths and static files (/media-kit.pdf) are served unprefixed.
  if (isMachinePath(href) || /\.[a-z0-9]+$/i.test(splitPath(href).pathname)) {
    return href;
  }
  return localizePath(delocalizeSegments(href));
}

/** A manifest route template (`/companies/:companySlug/jobs/:jobSlug`)
 * with each static segment in `words` (one locale's entries). Params and
 * splats stay; machine paths stay canonical. */
export function localizeRouteTemplate(
  template: string,
  words: Readonly<Record<string, string>> | undefined,
): string {
  if (!words) return template;
  const segments = template.split('/').filter(Boolean);
  if (isMachineSegments(segments)) return template;
  return template
    .split('/')
    .map((segment) => {
      if (segment === '' || segment.startsWith(':') || segment === '*') {
        return segment;
      }
      return Object.hasOwn(words, segment)
        ? (words[segment] ?? segment)
        : segment;
    })
    .join('/');
}
