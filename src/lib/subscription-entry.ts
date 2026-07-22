/**
 * The account "Subscription" entry is offered only to an entitled viewer on a
 * candidate-paywall board. A paywall-off board discards the grant read, so a
 * signed-in grant-holder there must never see it — non-subscribers reach the
 * paywall via the gated-listing teaser instead.
 *
 * The root loader resolves the single boolean the header consumes; this is that
 * derivation, kept pure so the gate is unit-testable behaviorally rather than
 * pinned by a source grep of `__root.tsx`.
 */
export function resolveSubscriptionEntryVisible(
  candidatePaywall: boolean,
  hasGrant: boolean,
): boolean {
  return candidatePaywall && hasGrant;
}
