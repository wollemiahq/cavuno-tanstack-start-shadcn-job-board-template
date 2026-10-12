/**
 * The canonical (English) route vocabulary, one entry per file route.
 *
 * Localized URL segments (src/lib/localized-path.ts) translate a path by
 * matching it against these templates: only a template's STATIC segments
 * translate, so a company whose slug is literally "jobs" keeps its slug.
 *
 * The list mirrors `FileRoutesByFullPath` in the generated route tree and
 * typecheck enforces it both ways: an entry that is not a route fails the
 * `satisfies`, and a new route missing here fails
 * `RouteTemplatesCoverRouteTree`. Keeping a copy (instead of reading the
 * route tree at runtime) keeps this module free of route imports, which
 * would be circular — routes render links through it.
 */
import type { FileRoutesByFullPath } from '../routeTree.gen';

type RouteFullPath = keyof FileRoutesByFullPath;

export const ROUTE_TEMPLATES = [
  '/',
  '/$',
  '/about',
  '/account',
  '/ads.txt',
  '/apply',
  '/coming-soon-gate',
  '/contact',
  '/cookie-policy',
  '/impressum',
  '/indexnow-key.txt',
  '/job-seekers',
  '/matches',
  '/memberships',
  '/messages',
  '/password',
  '/post',
  '/pricing',
  '/privacy-policy',
  '/robots.txt',
  '/saved-jobs',
  '/settings',
  '/site.webmanifest',
  '/sitemap.xml',
  '/terms-of-service',
  '/.well-known/cavuno.json',
  '/account/access',
  '/alerts/confirm',
  '/alerts/manage',
  '/auth/confirm-email-change',
  '/auth/forgot-password',
  '/auth/join',
  '/auth/magic-link',
  '/auth/oauth-complete',
  '/auth/reset-password',
  '/auth/sign-in',
  '/auth/sign-up',
  '/auth/verify-email',
  '/auth/verify-email-required',
  '/auth/verify-work-email',
  '/blog/$postSlug',
  '/blog/rss.xml',
  '/embed/jobs',
  '/employers/dashboard',
  '/go/$',
  '/jobs/$keyword',
  '/jobs/rss.xml',
  '/me/alerts',
  '/me/applications',
  '/messages/$conversationId',
  '/p/$handle',
  '/post/checkout-canceled',
  '/post/success',
  '/sitemap/$file',
  '/blog/',
  '/companies/',
  '/employer/',
  '/employers/',
  '/jobs/',
  '/salaries/',
  '/talent/',
  '/auth/employer/sign-up',
  '/blog/$postSlug/og',
  '/blog/author/$authorSlug',
  '/blog/og/{$postSlug}.json',
  '/blog/tag/$tagSlug',
  '/companies/markets/$market',
  '/employer/invites/accept',
  '/employers/invites/accept',
  '/employers/onboarding/$slug',
  '/jobs/skills/$skill',
  '/companies/$companySlug/',
  '/jobs/locations/',
  '/salaries/companies/',
  '/salaries/locations/',
  '/salaries/skills/',
  '/salaries/titles/',
  '/companies/$companySlug/jobs/$jobSlug',
  '/companies/$companySlug/salaries/$categorySlug',
  '/employer/$slug/jobs/new',
  '/employers/companies/$slug/members',
  '/employers/companies/$slug/profile',
  '/jobs/locations/$location/$keyword',
  '/salaries/locations/$slug/skills',
  '/salaries/locations/$slug/titles',
  '/salaries/skills/$slug/$locationSlug',
  '/salaries/skills/$slug/locations',
  '/salaries/titles/$slug/$locationSlug',
  '/salaries/titles/$slug/locations',
  '/companies/$companySlug/jobs/',
  '/companies/$companySlug/salaries/',
  '/employer/$slug/jobs/',
  '/employers/companies/$slug/',
  '/jobs/locations/$location/',
  '/salaries/locations/$slug/',
  '/salaries/skills/$slug/',
  '/salaries/titles/$slug/',
  '/companies/$companySlug/jobs/$jobSlug/og',
  '/employer/$slug/jobs/$jobId/applicants',
  '/employers/companies/$slug/jobs/new',
  '/jobs/locations/$location/skills/$skill',
  '/employers/companies/$slug/jobs/$jobId/applicants',
  '/employers/companies/$slug/jobs/$jobId/edit',
] as const satisfies readonly RouteFullPath[];

type AssertNever<T extends never> = T;

/** Fails typecheck when a file route is missing from ROUTE_TEMPLATES. */
export type RouteTemplatesCoverRouteTree = AssertNever<
  Exclude<RouteFullPath, (typeof ROUTE_TEMPLATES)[number]>
>;
