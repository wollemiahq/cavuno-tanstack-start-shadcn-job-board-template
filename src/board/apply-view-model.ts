import { boardCopy } from '#/copy';
/**
 * Apply-button VIEW-MODEL — the Layer-1b seam for the apply block
 * (ADR-0070 Phase 2). `toApplyButtonVM` is the ONLY place the apply
 * decision ladder (`resolveApplyAction`, ADR-0054) and the i18n apply copy
 * (`boardCopy`) touch the button. It returns the resolved action + the
 * labels the markup renders.
 *
 * Unlike the salary/job-card mappers this runs INSIDE the component on each
 * render, because the decision folds in the transient in-session `applied`
 * state — it is not derivable from loader data alone. The `ApplyButton`
 * presentation renders from `ApplyButtonVM` and imports nothing from
 * `@cavuno/board*` or `#/copy`, so restyling the button is pure markup while
 * the apply invariant (external URL applies to everyone; unverified native →
 * verify gate) stays sequestered in the SDK.
 */
import { resolveApplyAction } from '@cavuno/board';

import type { BoardLabelOverrides } from '@cavuno/board/format';

export type { BoardLabelOverrides };

/** The resolved apply decision (discriminated on `kind`). */
export type ApplyAction = ReturnType<typeof resolveApplyAction>;

export interface ApplyCopyVM {
  applyOnEmployerSiteLabel: string;
  signInToApplyLabel: string;
  verifyEmailToApplyLabel: string;
  appliedViewApplicationsLabel: string;
  applyingLabel: string;
  applyButtonText: string;
  applicationSubmitError: string;
}

export interface ApplyButtonVM {
  action: ApplyAction;
  copy: ApplyCopyVM;
}

export function toApplyButtonVM({
  jobSlug,
  applicationUrl,
  viewer,
  applied,
  language,
  labels,
}: {
  jobSlug: string | null;
  applicationUrl: string | null;
  viewer: { emailVerified: boolean } | null;
  /** `alreadyApplied` (server) OR the transient in-session applied state. */
  applied: boolean;
  language: string;
  labels?: BoardLabelOverrides;
}): ApplyButtonVM {
  const copy = boardCopy(language, labels).apply;
  return {
    action: resolveApplyAction({ jobSlug, applicationUrl, viewer, applied }),
    copy: {
      applyOnEmployerSiteLabel: copy.applyOnEmployerSiteLabel,
      signInToApplyLabel: copy.signInToApplyLabel,
      verifyEmailToApplyLabel: copy.verifyEmailToApplyLabel,
      appliedViewApplicationsLabel: copy.appliedViewApplicationsLabel,
      applyingLabel: copy.applyingLabel,
      applyButtonText: copy.applyButtonText,
      applicationSubmitError: copy.applicationSubmitError,
    },
  };
}
