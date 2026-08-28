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
 * the apply invariant (the registration wall gates every path; past it the
 * external URL applies to everyone; unverified native → verify gate) stays
 * sequestered in the SDK.
 */
import { isSafeApplicationUrl, resolveApplyDecision } from '@cavuno/board';

import { applyCopy } from '@/copy-groups/apply';

/** The resolved apply decision (discriminated on `kind`). */
export type ApplyAction = ReturnType<typeof resolveApplyDecision>;

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
  guestApplyHeading: string;
  guestNameLabel: string;
  guestEmailLabel: string;
  guestCoverNoteLabel: string;
  guestSubmitLabel: string;
  guestSignInInsteadLabel: string;
  guestEmailRequiredError: string;
  guestNotAllowedError: string;
  guestSubmittedHeading: string;
  guestSubmittedText: string;
}

export interface ApplyButtonVM {
  action: ResolvedApplyAction;
  copy: ApplyCopyVM;
}

/**
 * Narrow the copy group to the labels the markup renders. Every return path
 * ships the same set, so it lives in one place.
 */
function toCopyVM(copy: ReturnType<typeof applyCopy>): ApplyCopyVM {
  return {
    applyOnEmployerSiteLabel: copy.applyOnEmployerSiteLabel,
    signInToApplyLabel: copy.signInToApplyLabel,
    verifyEmailToApplyLabel: copy.verifyEmailToApplyLabel,
    appliedViewApplicationsLabel: copy.appliedViewApplicationsLabel,
    applyingLabel: copy.applyingLabel,
    applyButtonText: copy.applyButtonText,
    applicationSubmitError: copy.applicationSubmitError,
    locationNotEligibleError: copy.locationNotEligibleError,
    locationUnavailableTitle: copy.locationUnavailableTitle,
    guestApplyHeading: copy.guestApplyHeading,
    guestNameLabel: copy.guestNameLabel,
    guestEmailLabel: copy.guestEmailLabel,
    guestCoverNoteLabel: copy.guestCoverNoteLabel,
    guestSubmitLabel: copy.guestSubmitLabel,
    guestSignInInsteadLabel: copy.guestSignInInsteadLabel,
    guestEmailRequiredError: copy.guestEmailRequiredError,
    guestNotAllowedError: copy.guestNotAllowedError,
    guestSubmittedHeading: copy.guestSubmittedHeading,
    guestSubmittedText: copy.guestSubmittedText,
  };
}

export function toApplyButtonVM({
  jobSlug,
  applicationUrl,
  applyAction,
  viewer,
  applied,
  nativeApplications = true,
  registrationWall = false,
  allowGuestApply = false,
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
  /**
   * Board feature flag `features.registrationWall` (default-off). `true` ⇒
   * an anonymous visitor must sign in before ANY apply path, the external
   * employer link included — the hosted board opens its auth dialog for an
   * anonymous visitor on a walled board, and the API rejects an anonymous
   * guest apply there too. Sign-in, not verification, is the bar.
   */
  registrationWall?: boolean;
  /**
   * Does this render an inline guest-apply form? Opt-in: with the wall off
   * the hosted API accepts an anonymous apply, so forcing sign-in loses the
   * application — but a caller with no form must keep getting `sign-in`.
   */
  allowGuestApply?: boolean;
}): ApplyButtonVM {
  const copy = applyCopy();
  if (applyAction === 'gateway_external') {
    // The wall outranks the server-declared gateway contract: a walled board
    // must not hand an anonymous visitor a route to the employer. A gateway
    // job without a slug is malformed; fail closed rather than falling into
    // the legacy URL/native ladder.
    const gatewayAction: ResolvedApplyAction = !jobSlug
      ? { kind: 'none' }
      : registrationWall && !viewer
        ? { kind: 'sign-in', reason: 'registration-wall' }
        : { kind: 'gateway-external', jobSlug };
    return { action: gatewayAction, copy: toCopyVM(copy) };
  }
  if (applyAction === 'external_direct' && !applicationUrl) {
    return {
      action: { kind: 'none' },
      copy: toCopyVM(copy),
    };
  }
  const resolved = resolveApplyDecision({
    jobSlug,
    registrationWall,
    // A server-declared native job must not fall through to an old/redacted
    // URL. `gateway_external` is handled above; absent preserves old SDKs.
    applicationUrl:
      applyAction === 'native' || applyAction === 'gateway_native'
        ? null
        : applicationUrl,
    viewer,
    applied,
    allowGuestApply,
  });
  // An external-applications-only board has no working native path, so every
  // native-ladder outcome collapses to `none` rather than a dead-end form.
  // The wall's sign-in CTA survives that collapse ONLY when signing in would
  // actually reveal an external link — otherwise it is itself a dead end.
  const externalSurvivesWall =
    applyAction !== 'native' &&
    applyAction !== 'gateway_native' &&
    applicationUrl !== null &&
    isSafeApplicationUrl(applicationUrl);
  const keepDespiteNativeOff =
    resolved.kind === 'external' ||
    (resolved.kind === 'sign-in' &&
      resolved.reason === 'registration-wall' &&
      externalSurvivesWall);
  const action: ResolvedApplyAction =
    !nativeApplications && !keepDespiteNativeOff ? { kind: 'none' } : resolved;
  return {
    action,
    copy: toCopyVM(copy),
  };
}
