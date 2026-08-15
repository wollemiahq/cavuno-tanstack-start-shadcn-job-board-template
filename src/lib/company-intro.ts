/**
 * Company intro for job-detail about cards — platform `summary` only.
 *
 * Formerly accepted HTML `description` and re-derived a teaser in-app. The
 * Board API already publishes `CompanyPublic.summary` (operator text, or a
 * server-derived first-sentence teaser from the long body). Prefer that and
 * never strip company HTML on the main thread here.
 *
 * Returns `null` when summary is missing/blank — the about card still renders
 * name, logo, and profile link from `job.company`.
 */

export function companyIntro(
  summary: string | null | undefined,
): string | null {
  const trimmed = summary?.trim();
  return trimmed ? trimmed : null;
}
