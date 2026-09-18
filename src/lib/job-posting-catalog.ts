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
