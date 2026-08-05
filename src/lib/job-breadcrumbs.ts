import { buildJobBreadcrumbs as sdkBuildJobBreadcrumbs } from '@cavuno/board/seo';

import { m } from '../paraglide/messages';

import type { PublicJob } from '@cavuno/board';
/**
 * Map SDK `buildJobBreadcrumbs` structural crumbs to display names.
 *
 * Chrome crumbs (`home`, `jobs`) became `kind` discriminants in SDK 4.0 —
 * the application names those. Record-derived crumbs keep `name` (that
 * name is data off the job). Against older SDKs that still return
 * `name` for every crumb, we pass names through unchanged.
 */
import type { JobBreadcrumb } from '@cavuno/board/format';

export interface JobBreadcrumbItem {
  name: string;
  href?: string;
}

/**
 * 4.0.0 crumb contract: `home`/`jobs` are kind-only chrome crumbs (the app
 * owns their words); place/category/job crumbs carry the record's `name`.
 */
function crumbName(crumb: JobBreadcrumb): string {
  if (!('name' in crumb)) {
    return crumb.kind === 'home' ? m.breadcrumbs_home() : m.breadcrumbs_jobs();
  }
  return crumb.name;
}

/** Resolved breadcrumb trail for job-detail presentation. */
export function jobBreadcrumbItems(job: PublicJob): JobBreadcrumbItem[] {
  const crumbs = sdkBuildJobBreadcrumbs(job);
  return crumbs.map((crumb) => {
    const name = crumbName(crumb);
    return crumb.path === undefined ? { name } : { name, href: crumb.path };
  });
}

/** Shape expected by `listingJsonLd` breadcrumbs (name + optional path). */
export function jobBreadcrumbJsonLd(
  job: PublicJob,
): Array<{ name: string; path?: string }> {
  const crumbs = sdkBuildJobBreadcrumbs(job);
  return crumbs.map((crumb) => {
    const name = crumbName(crumb);
    return crumb.path === undefined ? { name } : { name, path: crumb.path };
  });
}
