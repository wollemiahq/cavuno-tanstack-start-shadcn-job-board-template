import {
  searchString,
  type UrlSearchInput,
  type UrlSearchValue,
} from './pagination';

export type HeaderSearchScope = 'jobs' | 'companies' | 'talent' | 'blog';

export interface HeaderSearchLocation {
  slug: string;
  name: string;
}

export interface HeaderSearchTerm {
  type: 'category' | 'skill' | 'post' | 'tag';
  slug: string;
  name: string;
}

export interface HeaderSearchMarket {
  slug: string;
  name: string;
}

export interface HeaderSearchState {
  visible: boolean;
  scope: HeaderSearchScope;
  query: string;
  location: HeaderSearchLocation | null;
  term: HeaderSearchTerm | null;
  market: HeaderSearchMarket | null;
}

export interface HeaderSearchSubmission {
  scope: HeaderSearchScope;
  query: string | undefined;
  location: HeaderSearchLocation | null;
  term: HeaderSearchTerm | null;
  market: HeaderSearchMarket | null;
}

interface HeaderRouteMatch {
  loaderData?: object | null;
}

interface HeaderLoaderEntity {
  displayName?: UrlSearchValue;
}

interface HeaderLoaderData {
  place?: HeaderLoaderEntity | null;
  category?: HeaderLoaderEntity | null;
  skill?: HeaderLoaderEntity | null;
  market?: HeaderLoaderEntity | null;
}

export interface HeaderRouteLabels {
  query?: string;
  location?: string;
}

const compactShellPrefixes = [
  '/account',
  '/alerts',
  '/auth',
  '/employers',
  '/me',
  '/messages',
  '/password',
  '/post',
  '/settings',
] as const;

function scopeFromPathname(
  pathname: string,
  fallback: HeaderSearchScope,
): HeaderSearchScope {
  if (pathname === '/blog' || pathname.startsWith('/blog/')) {
    return 'blog';
  }

  if (
    pathname === '/talent' ||
    pathname.startsWith('/talent/') ||
    pathname.startsWith('/p/')
  ) {
    return 'talent';
  }

  if (
    (pathname === '/companies' || pathname.startsWith('/companies/')) &&
    !pathname.includes('/jobs/')
  ) {
    return 'companies';
  }

  return fallback;
}

function stringSearchValue(value: UrlSearchValue) {
  return searchString(value) ?? '';
}

function routeData<T>(value: T): HeaderLoaderData | null {
  if (value === null || value === undefined || Object(value) !== value) {
    return null;
  }
  // SAFETY: Header label extraction only reads optional loader entity slots
  // and each visible label is decoded through searchString before use.
  return value as HeaderLoaderData;
}

function routeEntity<T>(value: T): HeaderLoaderEntity | null {
  if (value === null || value === undefined || Object(value) !== value) {
    return null;
  }
  // SAFETY: Header label entities use the same route-loader boundary as
  // routeData and only expose the optional displayName field.
  return value as HeaderLoaderEntity;
}

function displayName<T>(value: T) {
  const data = routeEntity(value);
  if (!data) {
    return undefined;
  }

  return searchString(data.displayName);
}

/** Preserve API-resolved route labels for the shared header controls. */
export function resolveHeaderRouteLabels(
  matches: readonly HeaderRouteMatch[],
): HeaderRouteLabels {
  for (const match of [...matches].reverse()) {
    const data = match.loaderData;
    const row = routeData(data);
    if (!row) continue;

    const location = displayName(row.place);
    const category = displayName(row.category);
    const skill = displayName(row.skill);
    const market = displayName(row.market);

    if (location || category || skill || market) {
      return { location, query: category ?? skill ?? market };
    }
  }

  return {};
}

function marketFromPathname(
  pathname: string,
  resolvedLabel?: string,
): HeaderSearchMarket | null {
  const slug = pathname.match(/^\/companies\/markets\/([^/]+)$/)?.[1];
  if (!slug) return null;

  return { slug, name: resolvedLabel ?? slug };
}

function locationFromPathname(
  pathname: string,
  resolvedLabel?: string,
): HeaderSearchLocation | null {
  const slug = pathname.match(/^\/jobs\/locations\/([^/]+)/)?.[1];
  if (!slug) return null;

  return {
    slug,
    name: resolvedLabel ?? slug,
  };
}

function termFromPathname(
  pathname: string,
  resolvedLabel?: string,
): HeaderSearchTerm | null {
  const skill = pathname.match(
    /^\/jobs\/(?:locations\/[^/]+\/)?skills\/([^/]+)$/,
  )?.[1];
  if (skill) {
    return { type: 'skill', slug: skill, name: resolvedLabel ?? skill };
  }

  const category =
    pathname.match(/^\/jobs\/locations\/[^/]+\/([^/]+)$/)?.[1] ??
    pathname.match(
      /^\/jobs\/(?!locations(?:\/|$)|skills(?:\/|$))([^/]+)$/,
    )?.[1];
  if (!category) return null;

  return {
    type: 'category',
    slug: category,
    name: resolvedLabel ?? category,
  };
}

/** Resolve router state before it crosses into the presentational header. */
export function resolveHeaderSearchState(
  pathname: string,
  search: UrlSearchInput,
  resolvedLocationLabel?: string,
  resolvedQueryLabel?: string,
  // What the viewer is most likely hunting when the route itself doesn't
  // scope the search: candidates (and signed-out visitors) hunt jobs;
  // employers hunt talent — the shell resolves this from identity + the
  // board's talent-directory visibility.
  fallbackScope: HeaderSearchScope = 'jobs',
): HeaderSearchState {
  const scope = scopeFromPathname(pathname, fallbackScope);
  const explicitQuery = stringSearchValue(
    scope === 'companies'
      ? search.query
      : scope === 'jobs'
        ? (search.q ?? search.query)
        : search.q,
  );

  return {
    visible: !compactShellPrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    ),
    scope,
    query:
      explicitQuery ||
      (scope === 'jobs' || scope === 'companies'
        ? (resolvedQueryLabel ?? '')
        : ''),
    location:
      scope === 'jobs'
        ? locationFromPathname(pathname, resolvedLocationLabel)
        : null,
    term:
      scope === 'jobs' && !explicitQuery
        ? termFromPathname(pathname, resolvedQueryLabel)
        : null,
    market:
      scope === 'companies' && !explicitQuery
        ? marketFromPathname(pathname, resolvedQueryLabel)
        : null,
  };
}
