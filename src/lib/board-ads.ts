const SLOT_ID_RE = /^\d{10}$/u;

const CLIENT_ID_RE = /^ca-pub-\d{16}$/u;

/** Public AdSense switch + publisher id from `board.context().ads`. */
export type BoardAdsConfig = {
  enabled: boolean;
  clientId: string | null;
  defaultSlotId?: string | null;
};

export const ADS_OFF: BoardAdsConfig = {
  enabled: false,
  clientId: null,
  defaultSlotId: null,
};

/**
 * Board context as far as ads. `object` is required so this is not a weak
 * type: 4.8.0 `PublicBoard` is assignable (it has `object`, not `ads`).
 */
export type BoardAdsSource = {
  object: string;
  ads?: BoardAdsConfig | null;
};

/**
 * Read `ads` off board context with deploy/SDK skew: older `@cavuno/board`
 * builds may omit the group or default slot. Missing units fail closed.
 */
export function resolveBoardAds(context: BoardAdsSource): BoardAdsConfig {
  const ads = context.ads;
  if (ads == null) return ADS_OFF;
  const enabled = ads.enabled === true;
  const raw = ads.clientId?.trim() ?? '';
  const clientId = CLIENT_ID_RE.test(raw) ? raw : null;
  const slot = ads.defaultSlotId?.trim() ?? '';
  return {
    enabled,
    clientId: enabled ? clientId : null,
    defaultSlotId: enabled && SLOT_ID_RE.test(slot) ? slot : null,
  };
}
