/**
 * Resolve a remote image to something Satori can actually draw.
 *
 * Cavuno stores uploaded company logos and author avatars as 256×256 WebP,
 * and Satori (via workers-og) has no WebP decoder: it fetches the URL,
 * decodes nothing, and the card renders the styled frame — border, radius —
 * with a blank hole where the logo should be. The hosted OG renderer
 * (`@takumi-rs`) decodes WebP, so this is a starter-only parity gap.
 *
 * `ogImageSrc` sniffs the real bytes (an R2 key carries no extension, so the
 * URL cannot be trusted), leaves anything Satori already handles alone, and
 * for WebP/AVIF asks Cloudflare to transform it to PNG. A `null` result means
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

/** The PNG the transform must return; also the pass-through happy case. */
function isPng(bytes: Uint8Array): boolean {
  return bytes[0] === 0x89 && bytes[1] === 0x50;
}

/** `RIFF????WEBP` and `????ftypavif` — the formats Satori cannot decode. */
function isSatoriBlind(bytes: Uint8Array): boolean {
  const ascii = (offset: number, text: string) =>
    [...text].every((char, i) => bytes[offset + i] === char.charCodeAt(0));
  return (ascii(0, 'RIFF') && ascii(8, 'WEBP')) || ascii(4, 'ftypavif');
}

/**
 * The leading bytes, without pulling the whole file: `Range` when the origin
 * honours it, a cancelled stream when it does not.
 */
async function sniff(
  url: string,
  fetchImpl: ImageFetch,
): Promise<Uint8Array | null> {
  const response = await fetchImpl(url, {
    headers: { Range: 'bytes=0-15' },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cf: { cacheTtl: IMAGE_EDGE_TTL, cacheEverything: true },
  });
  if (!response.ok || !response.body) return null;
  const reader = response.body.getReader();
  try {
    const { value } = await reader.read();
    return value && value.length >= 12 ? value : null;
  } finally {
    await reader.cancel();
  }
}

function toDataUri(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return `data:image/png;base64,${btoa(binary)}`;
}

/**
 * Re-fetch through Cloudflare image transformations. When the zone has them
 * disabled the hint is ignored and the original WebP comes back, so the
 * result is sniffed too: no PNG, no logo.
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
  return isPng(bytes) ? toDataUri(bytes) : null;
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
    if (!isSatoriBlind(bytes)) return url;
    return await transformToPng(url, fetchImpl);
  } catch {
    return null;
  }
}
