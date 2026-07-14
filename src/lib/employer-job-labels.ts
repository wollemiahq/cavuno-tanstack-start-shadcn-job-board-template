import { fieldLabel } from '@cavuno/board/format';

import { m } from '../paraglide/messages';

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

export function employerJobTypeLabel(
  language: string,
  employmentType: EmployerJob['employmentType'],
) {
  if (!employmentType) return '—';
  return fieldLabel(language, employmentType) ?? employmentType;
}
