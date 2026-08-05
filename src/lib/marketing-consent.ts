/**
 * Marketing-email consent — starter configuration.
 *
 * Consent is a property of the board user (recorded via the Cavuno API); the
 * wording someone agrees to belongs to THIS codebase (see the copy keys in
 * `messages/*.json`, `marketingConsent_*`). The API records the decision,
 * never the prose — so whatever these surfaces render is what the person
 * agreed to.
 *
 * Three optional surfaces, all OFF by default. Flip a flag to render that
 * surface's checkbox or settings row; leaving them off changes nothing.
 * Absence of a record means no consent — never a default, and never inferred
 * from a job-alert subscription.
 */
export const MARKETING_CONSENT = {
  /** Checkbox on the candidate sign-up form. */
  candidateSignUp: false,
  /** Checkbox on the employer sign-up form. */
  employerSignUp: false,
  /**
   * Grant-and-withdraw row on the /settings notification preferences. This
   * is the route back for someone who signed up before the checkbox existed
   * or withdrew and changed their mind — safe only because the disclosure
   * copy renders beside the control.
   */
  notificationPreferences: false,
  /**
   * Optional privacy-policy URL rendered as a link beside the disclosure.
   * Leave empty to render no link.
   */
  privacyPolicyUrl: '',
};

/**
 * Wire shape of `/me/marketing-consent`. Declared locally because this
 * template pins an SDK release predating `board.me.marketingConsent` — swap
 * to the SDK namespace and its exported `MarketingConsent` type when the
 * dependency is bumped.
 */
export interface MarketingConsentState {
  id: string;
  object: 'marketing_consent';
  status: 'granted' | 'withdrawn';
  source: string;
  reason: 'person_request' | 'operator_request' | 'account_deleted' | null;
  grantedAt: number | null;
  withdrawnAt: number | null;
  revision: number;
}
