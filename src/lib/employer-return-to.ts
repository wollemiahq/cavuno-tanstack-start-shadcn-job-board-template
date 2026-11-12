import { candidateReturnTo } from './candidate-return-to';
import { canonicalPathname } from './localized-path';

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

/** The employer dashboard, carrying where to continue once a company exists. */
export function employerDashboardHref(returnTo: string | undefined): string {
  return returnTo
    ? `${EMPLOYER_DASHBOARD}?${new URLSearchParams({ returnTo })}`
    : EMPLOYER_DASHBOARD;
}
