/**
 * Apply-button VIEW-MODEL — the Layer-1b seam for the apply block.
 * `toApplyButtonVM` is the only place the apply decision ladder and i18n copy
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

import { boardCopy } from '@/copy';


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
  nativeApplications = true,
}: {
  jobSlug: string | null;
  applicationUrl: string | null;
  viewer: { emailVerified: boolean } | null;
  /** `alreadyApplied` (server) OR the transient in-session applied state. */
  applied: boolean;
  language: string;
  /**
   * Board feature flag (default-on): `false` ⇒ external-applications-only.
   * The platform 422s a native apply, so a native-only job must NOT render a
   * dead-end native form — collapse every non-external outcome (native,
   * sign-in, verify, applied) to `none`. An external `applicationUrl` still
   * applies to everyone and is untouched.
   */
  nativeApplications?: boolean;
}): ApplyButtonVM {
  const copy = boardCopy(language).apply;
  const resolved = resolveApplyAction({
    jobSlug,
    applicationUrl,
    viewer,
    applied,
  });
  const action: ApplyAction =
    !nativeApplications && resolved.kind !== 'external'
      ? { kind: 'none' }
      : resolved;
  return {
    action,
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
