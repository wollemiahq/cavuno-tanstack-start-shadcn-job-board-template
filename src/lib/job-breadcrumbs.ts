import { BOARD_PATHS, companyPath } from '@cavuno/board/paths';

import { breadcrumbsCopy } from '../copy-groups/breadcrumbs';
import { jobLandingPath } from './job-landing';
import { localizePath } from './localized-path';

import type { PublicJob } from '@cavuno/board';
import type { JobLandingConsolidationMap } from '@cavuno/board/paths';

export interface JobBreadcrumbItem {
  name: string;
  href?: string;
}

/**
 * Job-detail trail: Home › Jobs › placeHierarchy › Company › title.
 *
 * Owned here because SDK `buildJobBreadcrumbs` inserts the primary category
 * and omits the company. Place crumbs link to
 * `/jobs/locations/:canonicalSlug`, or the page that place duplicates on the
 * board's consolidation map; the company links to its profile; the
 * title is the current page (no href).
 * The job URL itself stays `/companies/:company/jobs/:slug`.
 */
export function jobBreadcrumbItems(
  job: PublicJob,
  consolidation?: JobLandingConsolidationMap,
): JobBreadcrumbItem[] {
  const crumbs = breadcrumbsCopy();
  const items: JobBreadcrumbItem[] = [
    { name: crumbs.home, href: BOARD_PATHS.home },
    { name: crumbs.jobs, href: BOARD_PATHS.jobs },
  ];

  for (const place of job.placeHierarchy) {
    const name = place.name.trim();
    // `canonicalSlug` is the slug the location page lives at; the English
    // `slug` 308s to it on a translated board.
    const slug = place.canonicalSlug.trim();
    if (!name || !slug) continue;
    items.push({
      name,
      href: jobLandingPath({ placeSlug: slug }, consolidation),
    });
  }

  const companyName = job.company?.name?.trim();
  const companySlug = job.company?.slug?.trim();
  if (companyName && companySlug) {
    items.push({ name: companyName, href: companyPath(companySlug) });
  }

  items.push({ name: job.title });
  return items;
}

/** Shape expected by `listingJsonLd` breadcrumbs (name + optional path).
 * Paths localize so the structured data agrees with the rendered page —
 * a /fr/ page's BreadcrumbList must link the /fr/ cluster, not English. */
export function jobBreadcrumbJsonLd(
  job: PublicJob,
  consolidation?: JobLandingConsolidationMap,
): Array<{ name: string; path?: string }> {
  return jobBreadcrumbItems(job, consolidation).map((crumb) =>
    crumb.href
      ? { name: crumb.name, path: localizePath(crumb.href) }
      : { name: crumb.name },
  );
}
