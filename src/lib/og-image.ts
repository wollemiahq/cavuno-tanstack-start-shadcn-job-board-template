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

const PNG_MAGIC = '\x89PNG';

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
 * The formats on workers-og's supported list. Everything else — WebP and
 * AVIF included — paints the empty frame, so it has to go through the
 * transform. `<svg`/`<?xml` are matched anywhere in the window because an
 * SVG may open with a BOM or whitespace.
 */
function isSatoriReadable(bytes: Uint8Array): boolean {
  const start = head(bytes);
  return (
    start.startsWith(PNG_MAGIC) ||
    start.startsWith('\xff\xd8\xff') ||
    start.startsWith('GIF8') ||
    start.includes('<svg') ||
    start.includes('<?xml')
  );
}

/** The leading bytes, without pulling the whole file where `Range` is honoured. */
async function sniff(
  url: string,
  fetchImpl: ImageFetch,
): Promise<Uint8Array | null> {
  const response = await fetchImpl(url, {
    headers: { Range: 'bytes=0-15' },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cf: { cacheTtl: IMAGE_EDGE_TTL, cacheEverything: true },
  });
  if (!response.ok) return null;
  return new Uint8Array(await response.arrayBuffer());
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
  return head(bytes).startsWith(PNG_MAGIC) ? toDataUri(bytes) : null;
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
    const bytes = await sniff(url, fetchImpl);
    if (!bytes) return null;
    // Satori refetches the URL itself, exactly as before this existed.
    if (isSatoriReadable(bytes)) return url;
    return await transformToPng(url, fetchImpl);
  } catch {
    return null;
  }
}
