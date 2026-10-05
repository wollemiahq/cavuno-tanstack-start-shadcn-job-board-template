import { m } from '../paraglide/messages';
import { jobEmploymentTypeLabel } from './enum-labels';

import type { EmployerJob } from '@cavuno/board';

const statusLabels = {
  draft: m.employerJob_statusDraft,
  published: m.employerJob_statusPublished,
  expired: m.employerJob_statusExpired,
  archived: m.employerJob_statusArchived,
  pending_approval: m.employerJob_statusPendingApproval,
} satisfies Record<EmployerJob['status'], () => string>;

export function employerJobStatusLabel(status: string) {
  if (!(status in statusLabels))
    throw new Error(`Unknown employer job status: ${status}`);
  // SAFETY: The `status in statusLabels` guard proves this dynamic status is a
  // supported EmployerJob status before indexing the label map.
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
  _language: string,
  job: Pick<EmployerJob, 'employmentType' | 'customEmploymentType'>,
) {
  return jobEmploymentTypeLabel(job) ?? job.employmentType ?? '—';
}
