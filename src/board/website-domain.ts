/**
 * The domain a company website counts as, by the same rules the Board API
 * uses: lowercase, no scheme, path, query, port, leading `www.` or trailing
 * dot. The profile form compares two of these to tell whether an edit moves
 * the company to a new domain, which the API does not apply directly.
 */
export function websiteDomain(input: string | null | undefined): string | null {
  const value = (input ?? '')
    .trim()
    .toLowerCase()
    .replace(/^[a-z0-9+.-]+:\/\//, '')
    .split(/[/?#]/)[0]!
    .replace(/:[0-9]+$/, '')
    .replace(/^www\./, '')
    .replace(/\.+$/, '');
  return value === '' ? null : value;
}
