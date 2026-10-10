import { canonicalPathname, type LocaleRouting } from '@/lib/localized-path';

declare global {
  interface Window {
    /**
     * Read by the Cavuno Analytics script (`metrics.js`) when it sends: maps
     * the real pathname to the canonical English route path without a locale
     * prefix, so stats match localized URLs to jobs and companies.
     */
    cavunoCanonicalPathname?: (pathname: string) => string;
  }
}

/**
 * Defines `window.cavunoCanonicalPathname`: `canonicalPathname` for any
 * input, returning the input instead of throwing. Called right before the
 * analytics script is injected, so it exists before the script can send.
 * `routing` is a test seam; the runtime uses the compiled board setup.
 */
export function exposeAnalyticsCanonicalPathname(
  target: Window = window,
  routing?: LocaleRouting,
): void {
  target.cavunoCanonicalPathname = (pathname) => {
    try {
      return canonicalPathname(pathname, routing);
    } catch {
      return pathname;
    }
  };
}
