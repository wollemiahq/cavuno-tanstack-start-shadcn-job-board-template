import { fieldLabel } from '@cavuno/board/format';

import { m } from '@/paraglide/messages';

import type { EmployerJob } from '@cavuno/board';

const statusLabels: Record<EmployerJob['status'], () => string> = {
  draft: m.employerJob_statusDraft,
  published: m.employerJob_statusPublished,
  expired: m.employerJob_statusExpired,
  archived: m.employerJob_statusArchived,
};

export function employerJobStatusLabel(status: string) {
  if (!(status in statusLabels))
    throw new Error(`Unknown employer job status: ${status}`);
  return statusLabels[status as EmployerJob['status']]();
}

/**
 * The status chip's visual weight. `expired` gets its own distinct outline so
 * it no longer masquerades as a live `published` job.
 */
export function employerJobStatusBadgeVariant(
  status: EmployerJob['status'],
): 'default' | 'secondary' | 'outline' {
  switch (status) {
    case 'published':
      return 'default';
    case 'expired':
      return 'outline';
    default:
      return 'secondary';
  }
}

/**
 * A job reads as expired once the API marks it so, or once its expiry has
 * simply passed while the stored status still says `published`.
 */
export function isEmployerJobExpired(
  job: Pick<EmployerJob, 'status' | 'expiresAt'>,
  now: number = Date.now(),
): boolean {
  if (job.status === 'expired') return true;
  return job.expiresAt != null && Date.parse(job.expiresAt) < now;
}

export function employerJobTypeLabel(
  language: string,
  employmentType: EmployerJob['employmentType'],
) {
  if (!employmentType) return '—';
  return fieldLabel(language, employmentType) ?? employmentType;
}
