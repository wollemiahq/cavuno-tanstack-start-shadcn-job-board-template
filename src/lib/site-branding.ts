import brandingJson from '@/branding.json';

/** Machine-managed `src/branding.json` fields the builder / Prepare write. */
export type SiteBrandingFile = {
  logo?: string | null;
  language?: string | null;
  backgroundImageUrl?: string | null;
};

/**
 * Accept only an `https://` asset URL. Trim; reject http, protocol-relative,
 * blob, javascript, and empty values. The scheme match is case-insensitive.
 */
export function httpsAssetUrl(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (!/^https:\/\//i.test(trimmed)) return null;
  return trimmed;
}

// SAFETY: branding.json is machine-managed (stock `{}`). We only read
// optional string fields; extra keys are ignored.
const branding = brandingJson as SiteBrandingFile;

export function backgroundImageUrl(): string | null {
  return httpsAssetUrl(branding.backgroundImageUrl);
}
