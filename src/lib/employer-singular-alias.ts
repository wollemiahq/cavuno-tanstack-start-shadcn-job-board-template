/**
 * Cavuno-sent invite emails and Stripe Checkout return/cancel URLs have used
 * `/employer/...` (singular). This starter's real routes live under
 * `/employers/...`. Map the observed inbound paths onto those routes so the
 * links stop 404ing. Search strings (invite token, checkout session) stay
 * attached.
 */
export function employerSingularAliasHref(
  pathname: string,
  searchStr: string,
): string | null {
  const path = pathname.replace(/\/+$/, '') || '/';
  const query = searchStr.startsWith('?')
    ? searchStr
    : searchStr
      ? `?${searchStr}`
      : '';

  if (path === '/employer/invites/accept') {
    return `/employers/invites/accept${query}`;
  }

  const stripeBack = /^\/employer\/([^/]+)\/jobs\/new$/.exec(path);
  if (stripeBack) {
    return `/employers/companies/${stripeBack[1]}/jobs/new${query}`;
  }

  return null;
}
