const CLIENT_ID_RE = /^ca-pub-\d{16}$/u;

/** Public AdSense switch + publisher id from `board.context().ads`. */
export type BoardAdsConfig = {
  enabled: boolean;
  clientId: string | null;
};

const ADS_OFF: BoardAdsConfig = { enabled: false, clientId: null };

/**
 * Read `ads` off board context with deploy/SDK skew: older `@cavuno/board`
 * builds omit the group. Slot ids are never here — they live in `src/ads.json`.
 */
export function resolveBoardAds(context: unknown): BoardAdsConfig {
  if (typeof context !== 'object' || context === null || !('ads' in context)) {
    return ADS_OFF;
  }
  const ads = (context as { ads?: BoardAdsConfig | null }).ads;
  const enabled = ads?.enabled === true;
  const raw = typeof ads?.clientId === 'string' ? ads.clientId.trim() : '';
  const clientId = CLIENT_ID_RE.test(raw) ? raw : null;
  return { enabled, clientId: enabled ? clientId : null };
}
