/**
 * Bridge to Google's certified consent message (AdSense Privacy &
 * messaging), which the AdSense tag shows to EEA, UK and Swiss visitors
 * when the board turns on `ads.googleConsentMessage`. Loaded on demand by
 * `CookieConsentProvider`, only on those boards, to keep it out of the
 * shared shell.
 *
 * Reads the visitor's answer through the IAB TCF v2.2 CMP API
 * (`__tcfapi`), registered once Google's Funding Choices queue reports
 * `CONSENT_DATA_READY`. Browser-only; every global is read off `window`,
 * so tests install a fake `googlefc` / `__tcfapi` there.
 */

import {
  COOKIE_CONSENT_MAX_AGE,
  CONSENT_ID_RE,
  GOOGLE_DECLINE_STORAGE_KEY,
  fnv1a,
  readCookieConsent,
  type CookieBannerTrackers,
} from './cookie-consent';

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
  // The loader failed before this subscribed (`ensureAdSenseScript` marks it).
  if (document.getElementById(ADSENSE_SCRIPT_ID)?.hasAttribute('data-failed')) {
    giveUp();
  }

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

/**
 * Banner version for an answer given in Google's consent message. Its
 * wording lives in AdSense, so the version names the CMP build that showed
 * it (`cmpId`, `cmpVersion` from the TCData) and hashes that with the TCF
 * policy version and the trackers the answer governs. Deterministic,
 * `g1-cmp<id>v<version>-` + 8 hex digits.
 */
export function googleConsentMessageVersion(
  tcData: TcData,
  trackers: CookieBannerTrackers,
): string {
  const tags = Object.entries(trackers)
    .filter(([, on]) => on)
    .map(([tag]) => tag)
    .sort();
  const cmpId = tcData.cmpId ?? 0;
  const cmpVersion = tcData.cmpVersion ?? 0;
  return `g1-cmp${cmpId}v${cmpVersion}-${fnv1a(
    JSON.stringify([
      'google',
      cmpId,
      cmpVersion,
      tcData.tcfPolicyVersion ?? 0,
      tags,
    ]),
  )}`;
}

/**
 * Cookie holding the consent id while Google's message, not the board's
 * banner, records the visitor's answers (the consent cookie only exists
 * once the board's banner has a choice).
 */
export const CONSENT_ID_COOKIE = 'cavuno_consent_id';

/** The consent id from a Cookie header: the consent cookie's, else ours. */
export function readConsentId(
  cookieHeader: string | null | undefined,
): string | null {
  const fromConsent = readCookieConsent(cookieHeader)?.consentId;
  if (fromConsent) return fromConsent;
  const pair = (cookieHeader ?? '')
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${CONSENT_ID_COOKIE}=`));
  const value = pair?.slice(CONSENT_ID_COOKIE.length + 1) ?? '';
  return CONSENT_ID_RE.test(value) ? value : null;
}

/** Serialize the consent-id cookie (same lifetime as the consent cookie). */
export function serializeConsentId(consentId: string): string {
  return `${CONSENT_ID_COOKIE}=${consentId}; Path=/; Max-Age=${COOKIE_CONSENT_MAX_AGE}; SameSite=Lax`;
}

/** What one CMP report means for the board's consent state. */
export type GoogleConsentStep =
  /** No CMP answer, or GDPR does not apply: the board's banner. */
  | { kind: 'fallback' }
  /** Google's message is showing; the earlier answer stands meanwhile. */
  | { kind: 'shown' }
  /** An answer; `record` only for a visitor action (`useractioncomplete`). */
  | {
      kind: 'answer';
      allowed: boolean;
      record: {
        choice: 'accepted' | 'denied' | 'withdrawn';
        bannerVersion: string;
      } | null;
    };

/**
 * Read one CMP report. `previous` is the last answer's tracker gate in this
 * document: a refusal after an allowed answer is a withdrawal. The banner
 * version covers the trackers the answer governs (not AdSense, which
 * Google's message governs itself).
 */
export function googleConsentStep(
  update: GoogleConsentUpdate,
  previous: boolean | undefined,
  trackers: CookieBannerTrackers,
): GoogleConsentStep {
  if (update.kind === 'unavailable' || update.tcData.gdprApplies !== true) {
    return { kind: 'fallback' };
  }
  const { tcData } = update;
  if (tcData.eventStatus === 'cmpuishown') return { kind: 'shown' };
  const allowed = trackersAllowedFromTcData(tcData);
  if (tcData.eventStatus !== 'useractioncomplete') {
    return { kind: 'answer', allowed, record: null };
  }
  return {
    kind: 'answer',
    allowed,
    record: {
      choice: allowed ? 'accepted' : previous ? 'withdrawn' : 'denied',
      bannerVersion: googleConsentMessageVersion(tcData, {
        ...trackers,
        adsense: false,
      }),
    },
  };
}

/**
 * The consent id answers in Google's message are recorded under: the
 * consent cookie's, else the consent-id cookie's, else `known`, else a new
 * one (written to the consent-id cookie).
 */
export function googleConsentId(
  known: string | null,
  newId: () => string,
): string {
  const stored = readConsentId(document.cookie);
  if (stored) return stored;
  const consentId = known ?? newId();
  document.cookie = serializeConsentId(consentId);
  return consentId;
}

/**
 * Tell the visitor's other tabs about a decline in Google's message: they
 * stop Cavuno Analytics and clear analytics cookies (no reload).
 */
export function broadcastGoogleDecline(): void {
  try {
    localStorage.setItem(GOOGLE_DECLINE_STORAGE_KEY, String(Date.now()));
  } catch {
    // localStorage may be blocked; this tab's own decline still applies.
  }
}
