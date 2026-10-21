/**
 * The visitor's approximate location, from the geo Cloudflare attaches to the
 * incoming request (`request.cf.latitude` / `longitude` / `country`, which
 * locate the visitor's IP address, never their device).
 *
 * A live board Worker dispatched by the Cavuno platform gets no `request.cf`,
 * so the platform dispatcher forwards the same geo in one header instead:
 * `X-Cavuno-Visitor-Geo: country=AU; lat=-33.9; lng=151.2`. The dispatcher
 * strips any inbound copy before setting it, so it is trusted only because it
 * arrives through that dispatcher. `cf` wins whenever it has usable values
 * (local workerd dev).
 */

/** The `cf` geo fields Workers sends; a local server has no `cf` at all. */
export type RequestGeo = {
  latitude?: string;
  longitude?: string;
  country?: string;
};

/** Geo read from `X-Cavuno-Visitor-Geo`; `lat`/`lng` always come together. */
export type VisitorGeo = { country?: string; lat?: number; lng?: number };

export const VISITOR_GEO_HEADER = 'x-cavuno-visitor-geo';

type GeoRequest = Request & { cf?: RequestGeo };

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

/**
 * Parse `X-Cavuno-Visitor-Geo`: `;`-separated `key=value` pairs in any
 * order, unknown keys ignored. `lat`/`lng` come back only as a valid pair.
 */
export function parseVisitorGeoHeader(
  value: string | null | undefined,
): VisitorGeo {
  const fields = new Map<string, string>();
  for (const part of value?.split(';') ?? []) {
    const eq = part.indexOf('=');
    if (eq > 0) fields.set(part.slice(0, eq).trim(), part.slice(eq + 1).trim());
  }
  const country = fields.get('country');
  const near = approximateNear({
    latitude: fields.get('lat'),
    longitude: fields.get('lng'),
  });
  const geo: VisitorGeo = { ...near };
  if (country && /^[A-Z]{2}$/.test(country)) geo.country = country;
  return geo;
}

/** The visitor's rounded `near` point: `cf` first, then the dispatcher header. */
export function requestNear(
  request: GeoRequest,
): { lat: number; lng: number } | undefined {
  const near = approximateNear(request.cf);
  if (near) return near;
  const { lat, lng } = parseVisitorGeoHeader(
    request.headers.get(VISITOR_GEO_HEADER),
  );
  return lat === undefined || lng === undefined ? undefined : { lat, lng };
}

/** The visitor's country code: `cf` first, then the dispatcher header. */
export function requestCountry(request: GeoRequest): string | undefined {
  return (
    request.cf?.country ||
    parseVisitorGeoHeader(request.headers.get(VISITOR_GEO_HEADER)).country
  );
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
