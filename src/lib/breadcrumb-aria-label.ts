import { m } from '../paraglide/messages';

/**
 * Single-key resolution of `jobDetail.breadcrumbAriaLabel`, preserving
 * operator `jobCardLabels.breadcrumbAriaLabel` overrides exactly as
 * `jobDetailCopy` → `resolveCopyGroup` does — without pulling the full
 * 21-message jobDetail family into route modules.
 */
export function resolveJobDetailBreadcrumbAriaLabel(
  labels:
    | { jobCardLabels?: Record<string, string | null | undefined> | null }
    | null
    | undefined,
): string {
  const override = labels?.jobCardLabels?.breadcrumbAriaLabel;
  if (typeof override === 'string' && override.trim() !== '') return override;
  return m.jobDetail_breadcrumbAriaLabel();
}
