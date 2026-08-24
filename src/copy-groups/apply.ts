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
  };
}
