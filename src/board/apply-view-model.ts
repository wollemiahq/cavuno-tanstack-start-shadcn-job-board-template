/**
 * Apply-button VIEW-MODEL — the Layer-1b seam for the apply block.
 * `toApplyButtonVM` is the only place the apply decision ladder and i18n copy
 * (the route-owned copy resolver) touch the button. It returns the resolved
 * action + the
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

import { applyCopy } from '@/copy-groups/apply';

/** The resolved apply decision (discriminated on `kind`). */
export type ApplyAction = ReturnType<typeof resolveApplyAction>;

/**
 * Cavuno's additive public-job Apply contract. Keep this local until the
 * starter's pinned SDK version ships the generated DTO; it is data returned
 * only by the server-side Board client, never browser input.
 */
export type PublicApplyAction =
  | 'native'
  | 'gateway_native'
  | 'external_direct'
  | 'gateway_external';

export type ResolvedApplyAction =
  | ApplyAction
  | { kind: 'gateway-external'; jobSlug: string };

export interface ApplyCopyVM {
  applyOnEmployerSiteLabel: string;
  signInToApplyLabel: string;
  verifyEmailToApplyLabel: string;
  appliedViewApplicationsLabel: string;
  applyingLabel: string;
  applyButtonText: string;
  applicationSubmitError: string;
  locationNotEligibleError: string;
  locationUnavailableTitle: string;
}

export interface ApplyButtonVM {
  action: ResolvedApplyAction;
  copy: ApplyCopyVM;
}

export function toApplyButtonVM({
  jobSlug,
  applicationUrl,
  applyAction,
  viewer,
  applied,
  nativeApplications = true,
}: {
  jobSlug: string | null;
  applicationUrl: string | null;
  /** Server-supplied contract; absent keeps the pre-gateway behavior. */
  applyAction?: PublicApplyAction | null;
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
  const copy = applyCopy();
  if (applyAction === 'gateway_external') {
    return {
      // A gateway job without a slug is malformed; fail closed rather than
      // falling into the legacy URL/native ladder.
      action: jobSlug
        ? { kind: 'gateway-external', jobSlug }
        : { kind: 'none' },
      copy: {
        applyOnEmployerSiteLabel: copy.applyOnEmployerSiteLabel,
        signInToApplyLabel: copy.signInToApplyLabel,
        verifyEmailToApplyLabel: copy.verifyEmailToApplyLabel,
        appliedViewApplicationsLabel: copy.appliedViewApplicationsLabel,
        applyingLabel: copy.applyingLabel,
        applyButtonText: copy.applyButtonText,
        applicationSubmitError: copy.applicationSubmitError,
        locationNotEligibleError: copy.locationNotEligibleError,
        locationUnavailableTitle: copy.locationUnavailableTitle,
      },
    };
  }
  if (applyAction === 'external_direct' && !applicationUrl) {
    return {
      action: { kind: 'none' },
      copy: {
        applyOnEmployerSiteLabel: copy.applyOnEmployerSiteLabel,
        signInToApplyLabel: copy.signInToApplyLabel,
        verifyEmailToApplyLabel: copy.verifyEmailToApplyLabel,
        appliedViewApplicationsLabel: copy.appliedViewApplicationsLabel,
        applyingLabel: copy.applyingLabel,
        applyButtonText: copy.applyButtonText,
        applicationSubmitError: copy.applicationSubmitError,
        locationNotEligibleError: copy.locationNotEligibleError,
        locationUnavailableTitle: copy.locationUnavailableTitle,
      },
    };
  }
  const resolved = resolveApplyAction({
    jobSlug,
    // A server-declared native job must not fall through to an old/redacted
    // URL. `gateway_external` is handled above; absent preserves old SDKs.
    applicationUrl:
      applyAction === 'native' || applyAction === 'gateway_native'
        ? null
        : applicationUrl,
    viewer,
    applied,
  });
  const action: ResolvedApplyAction =
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
      locationNotEligibleError: copy.locationNotEligibleError,
      locationUnavailableTitle: copy.locationUnavailableTitle,
    },
  };
}
