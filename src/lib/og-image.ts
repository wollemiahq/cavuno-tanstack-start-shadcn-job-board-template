/**
 * Resolve a remote image to something Satori can actually draw.
 *
 * Cavuno stores uploaded company logos and author avatars as 256×256 WebP,
 * and Satori (via workers-og) decodes only PNG/APNG, JPEG, GIF and SVG: it
 * fetches the URL, decodes nothing, and the card renders the styled frame —
 * border, radius — with a blank hole where the logo should be. The hosted OG
 * renderer (`@takumi-rs`) decodes WebP, so this is a starter-only parity gap.
 *
 * `ogImageSrc` sniffs the real bytes (an R2 key carries no extension, so the
 * URL cannot be trusted), leaves anything Satori already handles alone, and
 * asks Cloudflare to transform everything else to PNG. `null` comes back
 * only for an image known to be undrawable and impossible to convert, and
 * means the caller must omit the whole element, not just the `src` — an
 * empty `<img>` is exactly the blank frame this exists to prevent.
 */

/** Both fetches are on the render path of a crawler request; fail fast. */
const FETCH_TIMEOUT_MS = 2000;

/** Edge TTL for the sniff and the transform (seconds). */
const IMAGE_EDGE_TTL = 86400;

/** The full 8 bytes Satori's own detector requires, not just `\x89PNG`. */
const PNG_SIGNATURE = '\x89PNG\r\n\x1a\n';

type WorkersRequestInit = RequestInit & {
  cf?: {
    cacheTtl?: number;
    cacheEverything?: boolean;
    image?: { format: 'png'; width: number };
  };
};

export type ImageFetch = (
  input: string,
  init?: WorkersRequestInit,
) => Promise<Response>;

/** The leading bytes as latin-1, so magic numbers read as their literals. */
function head(bytes: Uint8Array): string {
  return String.fromCharCode(...bytes.subarray(0, 16));
}

/**
 * What Satori decodes. SVG reaches its renderer only down the text path,
 * which it takes on an exact content-type match — its byte path has no SVG
 * branch at all and throws part-way through. So an SVG identified by bytes
 * alone is *not* readable; it has to be rasterised like a WebP.
 */
function isSatoriReadable(
  bytes: Uint8Array,
  contentType: string | null,
): boolean {
  if (contentType === 'image/svg+xml' || contentType === 'application/svg+xml')
    return true;
  const start = head(bytes);
  return (
    start.startsWith(PNG_SIGNATURE) ||
    start.startsWith('\xff\xd8\xff') ||
    start.startsWith('GIF8')
  );
}

function toDataUri(bytes: Uint8Array): string {
  let binary = '';
  // Chunked because a 256px PNG runs to tens of KB, and spreading that many
  // arguments into `fromCharCode` at once overflows the call stack.
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return `data:image/png;base64,${btoa(binary)}`;
}

/**
 * Re-fetch through Cloudflare image transformations. When the zone has them
 * disabled the hint is ignored and the original comes back, so the result is
 * sniffed too: no PNG, no logo. A failure here is `null`, never the original
 * URL — the sniff already proved Satori cannot draw that.
 */
async function transformToPng(
  url: string,
  fetchImpl: ImageFetch,
): Promise<string | null> {
  const response = await fetchImpl(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cf: {
      image: { format: 'png', width: 256 },
      cacheTtl: IMAGE_EDGE_TTL,
      cacheEverything: true,
    },
  });
  if (!response.ok) return null;
  const bytes = new Uint8Array(await response.arrayBuffer());
  return head(bytes).startsWith(PNG_SIGNATURE) ? toDataUri(bytes) : null;
}

/**
 * The leading bytes and their content-type, or `null` when the origin would
 * not say. Only the first bytes decide anything, so `Range` keeps the rest
 * of the file off the wire wherever the origin honours it.
 */
async function sniff(
  url: string,
  fetchImpl: ImageFetch,
): Promise<{ bytes: Uint8Array; contentType: string | null } | null> {
  try {
    const response = await fetchImpl(url, {
      headers: { Range: 'bytes=0-15' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cf: { cacheTtl: IMAGE_EDGE_TTL, cacheEverything: true },
    });
    if (!response.ok) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    return bytes.length === 0
      ? null
      : { bytes, contentType: response.headers.get('content-type') };
  } catch {
    return null;
  }
}

/**
 * The `src` to render for `url`. `null` — omit the whole element — when
 * there is nothing to draw: no url, or an image the sniff proved Satori
 * cannot draw and the transform could not convert. Never throws, and never
 * drops an image on a guess: a sniff that fails to identify anything hands
 * back the URL Satori fetched for itself before this module existed.
 */
export async function ogImageSrc(
  url: string | null | undefined,
  fetchImpl: ImageFetch = fetch,
): Promise<string | null> {
  if (!url) return null;
  const sniffed = await sniff(url, fetchImpl);
  if (!sniffed) return url;
  if (isSatoriReadable(sniffed.bytes, sniffed.contentType)) return url;
  return transformToPng(url, fetchImpl).catch(() => null);
}
