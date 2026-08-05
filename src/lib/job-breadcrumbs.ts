/**
 * Map SDK `buildJobBreadcrumbs` structural crumbs to display names.
 *
 * Chrome crumbs (`home`, `jobs`) became `kind` discriminants in SDK 4.0 —
 * the application names those. Record-derived crumbs keep `name` (that
 * name is data off the job). Against older SDKs that still return
 * `name` for every crumb, we pass names through unchanged.
 */
import { buildJobBreadcrumbs as sdkBuildJobBreadcrumbs } from '@cavuno/board/seo';

import { m } from '../paraglide/messages';

import type { PublicJob } from '@cavuno/board';

export interface JobBreadcrumbItem {
  name: string;
  href?: string;
}

/** Structural crumb shapes across SDK 3.x (name-only) and 4.x (kind union). */
type SdkCrumb = {
  kind?: 'home' | 'jobs' | 'place' | 'category' | 'job';
  name?: string;
  path?: string;
};

function crumbName(crumb: SdkCrumb): string {
  if (crumb.kind === 'home') return m.breadcrumbs_home();
  if (crumb.kind === 'jobs') return m.breadcrumbs_jobs();
  if (typeof crumb.name === 'string') return crumb.name;
  return '';
}

/** Resolved breadcrumb trail for job-detail presentation. */
export function jobBreadcrumbItems(job: PublicJob): JobBreadcrumbItem[] {
  const crumbs = sdkBuildJobBreadcrumbs(job) as SdkCrumb[];
  return crumbs.map((crumb) => {
    const name = crumbName(crumb);
    return crumb.path === undefined ? { name } : { name, href: crumb.path };
  });
}

/** Shape expected by `listingJsonLd` breadcrumbs (name + optional path). */
export function jobBreadcrumbJsonLd(
  job: PublicJob,
): Array<{ name: string; path?: string }> {
  const crumbs = sdkBuildJobBreadcrumbs(job) as SdkCrumb[];
  return crumbs.map((crumb) => {
    const name = crumbName(crumb);
    return crumb.path === undefined ? { name } : { name, path: crumb.path };
  });
}
