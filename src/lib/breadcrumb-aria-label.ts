import { m } from '../paraglide/messages';

/**
 * Single-key resolution of `jobDetail.breadcrumbAriaLabel` without pulling
 * the full 21-message jobDetail family into route modules. Operator label
 * overrides were removed from the Board API in 4.0.0.
 */
export function resolveJobDetailBreadcrumbAriaLabel(): string {
  return m.jobDetail_breadcrumbAriaLabel();
}
