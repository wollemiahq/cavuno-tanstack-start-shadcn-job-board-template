const WORKING_PREVIEW_HOST_SUFFIXES = [
  '.preview.cavuno.com',
  '.preview-dev.cavuno.com',
] as const;

/**
 * WORKING previews run on dedicated host zones with intentionally restricted
 * network access. Analytics there would pollute board traffic and generate
 * expected CSP failures, so only those exact subdomain zones are suppressed.
 */
export function isWorkingPreviewHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/\.$/, '');
  return WORKING_PREVIEW_HOST_SUFFIXES.some((suffix) =>
    normalized.endsWith(suffix),
  );
}
