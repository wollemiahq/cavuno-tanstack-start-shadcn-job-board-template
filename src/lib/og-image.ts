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
 * asks Cloudflare to transform everything else to PNG. A `null` result means
 * the caller must omit the whole element, not just the `src` — an empty
 * `<img>` is exactly the blank frame this exists to prevent.
 */

/** Both fetches are on the render path of a crawler request; fail fast. */
const FETCH_TIMEOUT_MS = 2000;

/** Edge TTL for the sniff and the transform (seconds). */
const IMAGE_EDGE_TTL = 86400;

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
 * What Satori decodes. It takes the SVG text path only when the response
 * says `image/svg+xml`; otherwise it sniffs bytes, and its own SVG test
 * requires an `<?xml` prolog — a bare `<svg …>` is not detected. Everything
 * else, WebP and AVIF included, paints the empty frame.
 */
function isSatoriReadable(
  bytes: Uint8Array,
  contentType: string | null,
): boolean {
  if (contentType?.startsWith('image/svg+xml')) return true;
  const start = head(bytes);
  return (
    start.startsWith('\x89PNG') ||
    start.startsWith('\xff\xd8\xff') ||
    start.startsWith('GIF8') ||
    start.startsWith('<?xml')
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
 * sniffed too: no PNG, no logo.
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
  return head(bytes).startsWith('\x89PNG') ? toDataUri(bytes) : null;
}

/**
 * The `src` to render for `url`, or `null` when the element must be dropped.
 * Never throws: a slow, missing, or undecodable image degrades the card to
 * its no-logo layout rather than failing the render.
 */
export async function ogImageSrc(
  url: string | null | undefined,
  fetchImpl: ImageFetch = fetch,
): Promise<string | null> {
  if (!url) return null;
  try {
    // Only the leading bytes decide anything, so `Range` keeps the rest of
    // the file off the wire wherever the origin honours it.
    const response = await fetchImpl(url, {
      headers: { Range: 'bytes=0-15' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cf: { cacheTtl: IMAGE_EDGE_TTL, cacheEverything: true },
    });
    if (!response.ok) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    // Too short to identify anything — don't pay for a transform of it.
    if (bytes.length < 8) return null;
    // Satori refetches the URL itself, exactly as before this existed.
    if (isSatoriReadable(bytes, response.headers.get('content-type'))) {
      return url;
    }
    return await transformToPng(url, fetchImpl);
  } catch {
    return null;
  }
}
