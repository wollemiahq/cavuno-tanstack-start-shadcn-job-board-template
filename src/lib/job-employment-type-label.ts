import { enumLabel } from '@/lib/enum-labels';

/**
 * Display label for a job's employment type. A board's custom type (e.g.
 * "Casual") wins over its built-in Google equivalent; the custom label is
 * operator-authored text, so it renders as-is rather than through the
 * message catalog.
 */
export function jobEmploymentTypeLabel(
  job: {
    employmentType?: string | null;
    customEmploymentType?: { label: string } | null;
  },
  language?: string,
): string | null {
  return (
    job.customEmploymentType?.label ?? enumLabel(job.employmentType, language)
  );
}
