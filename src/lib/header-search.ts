export type HeaderSearchScope = "jobs" | "companies" | "talent";

export interface HeaderSearchLocation {
  slug: string;
  name: string;
}

export interface HeaderSearchState {
  visible: boolean;
  scope: HeaderSearchScope;
  query: string;
  location: HeaderSearchLocation | null;
}

export interface HeaderSearchSubmission {
  scope: HeaderSearchScope;
  query: string | undefined;
  location: HeaderSearchLocation | null;
}

const compactShellPrefixes = [
  "/account",
  "/alerts",
  "/auth",
  "/employers",
  "/me",
  "/messages",
  "/password",
  "/post",
  "/settings",
] as const;

function scopeFromPathname(pathname: string): HeaderSearchScope {
  if (
    pathname === "/talent" ||
    pathname.startsWith("/talent/") ||
    pathname.startsWith("/p/")
  ) {
    return "talent";
  }

  if (
    (pathname === "/companies" || pathname.startsWith("/companies/")) &&
    !pathname.includes("/jobs/")
  ) {
    return "companies";
  }

  return "jobs";
}

function stringSearchValue(value: unknown) {
  return typeof value === "string" ? value : "";
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

/** Resolve router state before it crosses into the presentational header. */
export function resolveHeaderSearchState(
  pathname: string,
  search: Record<string, unknown>,
  resolvedLocationLabel?: string,
): HeaderSearchState {
  const scope = scopeFromPathname(pathname);

  return {
    visible: !compactShellPrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    ),
    scope,
    query: stringSearchValue(scope === "companies" ? search.query : search.q),
    location:
      scope === "jobs"
        ? locationFromPathname(pathname, resolvedLocationLabel)
        : null,
  };
}
