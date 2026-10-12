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
