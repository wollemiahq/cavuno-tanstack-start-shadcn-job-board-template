/**
 * The visitor's approximate location for ranking place suggestions, from the
 * geo Cloudflare attaches to the incoming request (`request.cf.latitude` /
 * `longitude`, which locate the visitor's IP address, never their device).
 */

/** The `cf` geo fields Workers sends; a local server has no `cf` at all. */
export type RequestGeo = { latitude?: string; longitude?: string };

/**
 * `cf` geo as a `near` point rounded to one decimal (about 11 km), so the
 * suggest request varies by area rather than by visitor and caches well;
 * `undefined` when the request has no usable geo.
 */
export function approximateNear(
  cf: RequestGeo | undefined,
): { lat: number; lng: number } | undefined {
  const lat = coordinate(cf?.latitude, 90);
  const lng = coordinate(cf?.longitude, 180);
  if (lat === undefined || lng === undefined) return undefined;
  return { lat, lng };
}

function coordinate(
  text: string | undefined,
  limit: number,
): number | undefined {
  if (!text?.trim()) return undefined;
  const value = Number(text);
  if (!Number.isFinite(value) || Math.abs(value) > limit) return undefined;
  // `+ 0` turns a rounded `-0` into `0`, so both send the same URL.
  return Math.round(value * 10) / 10 + 0;
}
