/**
 * Whether this board is selling (or already sold) a way to publish a job.
 * An empty catalog is the operator turning posting off — not a free listing
 * and not a draft holding pen.
 */
export function hasJobPostingProduct(input: {
  plans: readonly unknown[];
  billingOptions: readonly unknown[];
}): boolean {
  return input.plans.length > 0 || input.billingOptions.length > 0;
}

/** Wire fields the leftover-credit default needs — a credit, not a plan for sale. */
export type LeftoverBillingCredit = {
  id: string;
  type?: string;
  kind?: string;
  jobsRemaining?: number;
  jobsUnlimited?: boolean;
};

/**
 * Pre-select prepaid inventory the company already holds. Membership posts
 * and plan assignments win over leftover orders; exhausted credits are
 * skipped. Paid plans stay unselected — skipping the picker must not invent
 * a free publish.
 */
export function defaultBillingSelection(
  billingOptions: readonly LeftoverBillingCredit[],
): string | null {
  const usable = billingOptions.filter(
    (option) =>
      option.jobsUnlimited === true || (option.jobsRemaining ?? 0) > 0,
  );
  const preferred =
    usable.find((option) => option.kind === 'member_post') ??
    usable.find((option) => option.type === 'plan_assignment') ??
    usable[0];
  return preferred ? `option:${preferred.id}` : null;
}
