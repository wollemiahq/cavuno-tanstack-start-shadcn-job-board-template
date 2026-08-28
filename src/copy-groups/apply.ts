import { m } from '../paraglide/messages';

export function applyCopy() {
  return {
    applicationSubmitError: m.apply_applicationSubmitError(),
    locationNotEligibleError: m.apply_locationNotEligibleError(),
    locationUnavailableTitle: m.apply_locationUnavailableTitle(),
    appliedViewApplicationsLabel: m.apply_appliedViewApplicationsLabel(),
    applyButtonText: m.apply_applyButtonText(),
    applyOnEmployerSiteLabel: m.apply_applyOnEmployerSiteLabel(),
    applyingLabel: m.apply_applyingLabel(),
    signInToApplyLabel: m.apply_signInToApplyLabel(),
    verifyEmailToApplyLabel: m.apply_verifyEmailToApplyLabel(),
    guestApplyHeading: m.apply_guestApplyHeading(),
    guestNameLabel: m.apply_guestNameLabel(),
    guestEmailLabel: m.apply_guestEmailLabel(),
    guestCoverNoteLabel: m.apply_guestCoverNoteLabel(),
    guestSubmitLabel: m.apply_guestSubmitLabel(),
    guestSignInInsteadLabel: m.apply_guestSignInInsteadLabel(),
    guestEmailRequiredError: m.apply_guestEmailRequiredError(),
    guestNotAllowedError: m.apply_guestNotAllowedError(),
    guestSubmittedHeading: m.apply_guestSubmittedHeading(),
    guestSubmittedText: m.apply_guestSubmittedText(),
  };
}
