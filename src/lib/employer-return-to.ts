import { candidateReturnTo } from './candidate-return-to';
import { canonicalPathname, localizePath } from './localized-path';

const EMPLOYER_DASHBOARD = '/employers/dashboard';

/**
 * The page a new employer goes back to once their company is set up, such as
 * Post a job when they joined from it. Undefined when there is none, and for
 * the candidate destinations (`/account`, `/matches`) that sign-in links pass
 * by default: an employer would land on a page they cannot use.
 */
export function employerReturnTo(
  value: string | undefined,
): string | undefined {
  if (!value) return undefined;
  const returnTo = candidateReturnTo(value);
  const pathname = canonicalPathname(returnTo);
  if (
    pathname === '/' ||
    pathname === '/account' ||
    pathname.startsWith('/account/') ||
    pathname === '/matches' ||
    pathname === EMPLOYER_DASHBOARD
  ) {
    return undefined;
  }
  return returnTo;
}

/**
 * Where a sign-in continues. Sign-in links return to `/account` by default,
 * the candidate home; an employer goes to the employer dashboard instead,
 * which opens their company directly when they have only one. Any other
 * destination, and every candidate, is left as it is. The query string is
 * kept: it carries the auth-flow parameters the completion step reads.
 */
export function signInReturnTo(
  returnTo: string,
  role: 'candidate' | 'employer' | undefined,
): string {
  if (role !== 'employer') return returnTo;
  const url = new URL(returnTo, 'https://board.invalid');
  if (canonicalPathname(url.pathname) !== '/account') return returnTo;
  return `${localizePath(EMPLOYER_DASHBOARD)}${url.search}${url.hash}`;
}

/** The employer dashboard, carrying where to continue once a company exists. */
export function employerDashboardHref(returnTo: string | undefined): string {
  return returnTo
    ? `${EMPLOYER_DASHBOARD}?${new URLSearchParams({ returnTo })}`
    : EMPLOYER_DASHBOARD;
}
