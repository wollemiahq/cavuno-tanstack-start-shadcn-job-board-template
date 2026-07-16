export type HeaderSearchScope = 'jobs' | 'companies' | 'talent' | 'blog';

export interface HeaderSearchLocation {
  slug: string;
  name: string;
}

export interface HeaderSearchTerm {
  type: 'category' | 'skill';
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
  loaderData?: unknown;
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

function scopeFromPathname(pathname: string): HeaderSearchScope {
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

  return 'jobs';
}

function stringSearchValue(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function displayName(value: unknown) {
  if (!value || typeof value !== 'object' || !('displayName' in value)) {
    return undefined;
  }

  return typeof value.displayName === 'string' ? value.displayName : undefined;
}

/** Preserve API-resolved route labels for the shared header controls. */
export function resolveHeaderRouteLabels(
  matches: readonly HeaderRouteMatch[],
): HeaderRouteLabels {
  for (const match of [...matches].reverse()) {
    const data = match.loaderData;
    if (!data || typeof data !== 'object') continue;

    const location = 'place' in data ? displayName(data.place) : undefined;
    const category =
      'category' in data ? displayName(data.category) : undefined;
    const skill = 'skill' in data ? displayName(data.skill) : undefined;
    const market = 'market' in data ? displayName(data.market) : undefined;

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
  search: Record<string, unknown>,
  resolvedLocationLabel?: string,
  resolvedQueryLabel?: string,
): HeaderSearchState {
  const scope = scopeFromPathname(pathname);
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
