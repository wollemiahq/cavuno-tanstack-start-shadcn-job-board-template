/**
 * Bridge to Google's certified consent message (AdSense Privacy &
 * messaging), which the AdSense tag shows to EEA, UK and Swiss visitors
 * when the board turns on `ads.googleConsentMessage`.
 *
 * Reads the visitor's answer through the IAB TCF v2.2 CMP API
 * (`__tcfapi`), registered once Google's Funding Choices queue reports
 * `CONSENT_DATA_READY`. Browser-only; every global is read off `window`,
 * so tests install a fake `googlefc` / `__tcfapi` there.
 */

/** The TCData fields this board reads (IAB CMP API v2). */
export interface TcData {
  gdprApplies?: boolean;
  /** `tcloaded`, `cmpuishown` or `useractioncomplete`. */
  eventStatus?: string;
  listenerId?: number;
  cmpId?: number;
  cmpVersion?: number;
  tcfPolicyVersion?: number;
  publisher?: { consents?: Record<string, boolean | undefined> };
}

type TcfApi = (
  command: string,
  version: number,
  callback: (tcData: TcData, success: boolean) => void,
  listenerId?: number,
) => void;

/** Funding Choices queue entries, keyed by the readiness they wait for. */
interface GoogleFcQueueItem {
  /** The API is callable (`showRevocationMessage`). */
  CONSENT_API_READY?: () => void;
  /** Consent data (TCData) is available. */
  CONSENT_DATA_READY?: () => void;
}

interface GoogleFc {
  callbackQueue?: { push: (item: GoogleFcQueueItem) => void };
  showRevocationMessage?: () => void;
}

declare global {
  interface Window {
    __tcfapi?: TcfApi;
    googlefc?: GoogleFc;
  }
}

/**
 * The board owner's own-use purposes whose consent lets the board's
 * trackers run: 1 store/access information on a device, 7 measure
 * advertising performance, 8 measure content performance, 9 understand
 * audiences through statistics.
 */
export const TRACKER_PUBLISHER_PURPOSES = [1, 7, 8, 9] as const;

/**
 * The tracker gate when Google's message is in charge. Cavuno Analytics,
 * GA4/GTM, Meta and LinkedIn are not vendors in Google's message, so only
 * the publisher (own-use) consents speak for them. Fails closed: each of
 * purposes 1, 7, 8 and 9 must be strictly `true`.
 */
export function trackersAllowedFromTcData(tcData: TcData): boolean {
  if (tcData.gdprApplies !== true) return false;
  const consents = tcData.publisher?.consents;
  return TRACKER_PUBLISHER_PURPOSES.every(
    (purpose) => consents?.[purpose] === true,
  );
}

/** How long to wait for Google's CMP before showing the board's banner. */
export const GOOGLE_CONSENT_TIMEOUT_MS = 3000;

/** Script id the shared AdSense loader uses (`ensureAdSenseScript`). */
const ADSENSE_SCRIPT_ID = 'cavuno-adsense-loader';

export type GoogleConsentUpdate =
  | { kind: 'unavailable' }
  | { kind: 'tcdata'; tcData: TcData };

/** Google's queue; an array until the Funding Choices script takes it over. */
function googleFcQueue(): NonNullable<GoogleFc['callbackQueue']> {
  const googlefc = (window.googlefc ??= {});
  const pending: GoogleFcQueueItem[] = [];
  return (googlefc.callbackQueue ??= pending);
}

/**
 * Listen for the visitor's TCF consent. `onUpdate` gets every TCData the
 * CMP reports (first `tcloaded` or `cmpuishown`, then `useractioncomplete`
 * on each answer). It gets `unavailable` once if the AdSense loader fails
 * (ad blocker, network) or no TCData arrives within `timeoutMs`; a TCData
 * arriving after that is still delivered. Returns an unsubscribe.
 */
export function subscribeGoogleConsent(
  onUpdate: (update: GoogleConsentUpdate) => void,
  { timeoutMs = GOOGLE_CONSENT_TIMEOUT_MS }: { timeoutMs?: number } = {},
): () => void {
  let active = true;
  let heard = false;
  let listenerId: number | undefined;
  const giveUp = () => {
    window.clearTimeout(timer);
    window.removeEventListener('error', onScriptError, true);
    if (!active || heard) return;
    heard = true;
    onUpdate({ kind: 'unavailable' });
  };
  const timer = window.setTimeout(giveUp, timeoutMs);
  // Script load errors do not bubble; catch them on the way down.
  const onScriptError = (event: Event) => {
    const target = event.target;
    if (target instanceof HTMLElement && target.id === ADSENSE_SCRIPT_ID) {
      giveUp();
    }
  };
  window.addEventListener('error', onScriptError, true);

  const onTcData = (tcData: TcData, success: boolean) => {
    if (!active || !success) return;
    listenerId ??= tcData.listenerId;
    if (!heard) {
      heard = true;
      window.clearTimeout(timer);
      window.removeEventListener('error', onScriptError, true);
    }
    onUpdate({ kind: 'tcdata', tcData });
  };
  googleFcQueue().push({
    CONSENT_DATA_READY: () => {
      if (active) window.__tcfapi?.('addEventListener', 2.2, onTcData);
    },
  });

  return () => {
    active = false;
    window.clearTimeout(timer);
    window.removeEventListener('error', onScriptError, true);
    if (listenerId !== undefined) {
      window.__tcfapi?.('removeEventListener', 2.2, () => {}, listenerId);
    }
  };
}

/**
 * Show Google's consent message again ("Cookie preferences"). Queued, so
 * it also works if the CMP is still loading.
 */
export function showGoogleConsentMessage(): void {
  googleFcQueue().push({
    CONSENT_API_READY: () => window.googlefc?.showRevocationMessage?.(),
  });
}
