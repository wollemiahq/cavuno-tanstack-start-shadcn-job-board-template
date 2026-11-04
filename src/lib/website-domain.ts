/**
 * The domain a company's work emails must be on: the website's host,
 * lowercased, without a port, a leading `www.` or trailing dots — the key the
 * Board API compares a work email against (`https://www.example.com./jobs`
 * → `example.com`). `undefined` when the website has no host.
 */
export function websiteDomain(
  website: string | null | undefined,
): string | undefined {
  const domain = (website ?? '')
    .trim()
    .toLowerCase()
    .replace(/^[a-z0-9+.-]+:\/\//, '')
    .split(/[/?#]/)[0]!
    .replace(/:[0-9]+$/, '')
    .replace(/^www\./, '')
    .replace(/\.+$/, '');
  return domain === '' ? undefined : domain;
}

/** A website as typed into a field that shows `https://` before it. */
export function stripProtocol(url: string): string {
  return url.trim().replace(/^https?:\/\//i, '');
}

/**
 * The URL to save for a website typed after an `https://` prefix: `''` when
 * empty, which clears it on an edit.
 */
export function websiteUrl(typed: string): string {
  const host = stripProtocol(typed);
  return host ? `https://${host}` : '';
}
