const CLIENT_ID_RE = /^ca-pub-\d{16}$/u;

/** Public AdSense switch + publisher id from `board.context().ads`. */
export type BoardAdsConfig = {
  enabled: boolean;
  clientId: string | null;
};

export const ADS_OFF: BoardAdsConfig = { enabled: false, clientId: null };

/** Board context as far as ads: 4.8.0 omits `ads`; later SDKs include it. */
export type BoardAdsSource = {
  ads?: BoardAdsConfig | null;
};

/**
 * Read `ads` off board context with deploy/SDK skew: older `@cavuno/board`
 * builds omit the group. Slot ids are never here — they live in `src/ads.json`.
 */
export function resolveBoardAds(context: BoardAdsSource): BoardAdsConfig {
  const ads = context.ads;
  if (ads == null) return ADS_OFF;
  const enabled = ads.enabled === true;
  const raw = ads.clientId?.trim() ?? '';
  const clientId = CLIENT_ID_RE.test(raw) ? raw : null;
  return { enabled, clientId: enabled ? clientId : null };
}
