'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { analytics, type RecordConsentInput } from '@cavuno/board/analytics';
import { Link } from '@tanstack/react-router';
import { CookieIcon } from 'lucide-react';

import { m } from '../paraglide/messages';
import { isWorkingPreviewHostname } from './analytics-preview';

import { useBoardAds } from '@/components/board/board-ads-provider';
import { FloatingStackItem } from '@/components/floating-stack';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { footerCopy } from '@/copy-groups/footer';
import {
  clearAnalyticsCookies,
  withdrawAnalytics as withdrawLoadedAnalytics,
} from '@/lib/analytics-withdrawal';
import {
  clearCookieConsent,
  cookieBannerVersion,
  GOOGLE_DECLINE_STORAGE_KEY,
  readCookieConsent,
  serializeCookieConsent,
  serializeReopenedCookieConsent,
  type CookieBannerCopy,
  type CookieBannerTrackers,
  type CookieConsentChoice,
} from '@/lib/cookie-consent';
import type { GoogleConsentUpdate } from '@/lib/google-tcf';

/** The Google CMP bridge, loaded only on boards that use Google's message. */
type GoogleTcf = typeof import('@/lib/google-tcf');
import { chromeCookieConsent } from '@/lib/site-chrome';

/**
 * Cross-tab mirror of the choice: its `storage` event tells other tabs. The
 * consent cookie is the source of truth (a pre-cookie value found here is
 * migrated to the cookie on mount).
 */
const STORAGE_KEY = 'cavuno:cookie-consent';

export type { CookieConsentChoice };

declare global {
  interface Window {
    /** Cavuno tracker kill switch: `metrics.js` sends nothing while true. */
    __cavunoAnalyticsOff?: boolean;
  }
}

/**
 * Whose consent UI is in charge for this visitor: the board's banner,
 * Google's consent message (AdSense boards with `ads.googleConsentMessage`,
 * visitor where GDPR applies), or not known yet (waiting for Google's CMP).
 */
export type ConsentSource = 'cavuno' | 'pending' | 'google';

interface CookieConsentState {
  /** The board's `analytics.cookieConsentRequired` flag. */
  required: boolean;
  consentSource: ConsentSource;
  /**
   * The tracker gate (Cavuno Analytics, GA4/GTM, Meta, LinkedIn). Google
   * in charge: the visitor's publisher-purpose consent. Pending: false.
   * Otherwise: consent not required, or accepted on the board's banner.
   */
  allowed: boolean;
  /**
   * Whether AdSense may load and render units: always when Google's
   * consent message governs ads, otherwise the same rule as `allowed`.
   */
  adsAllowed: boolean;
  /**
   * Saved choice. `undefined` until the client resolves cookie/storage;
   * `null` once resolved and still undecided.
   */
  choice: CookieConsentChoice | null | undefined;
  /** True while the accept/deny banner occupies the floating-stack slot. */
  bannerOpen: boolean;
  accept: () => void;
  deny: () => void;
  /**
   * Reopen the banner ("Cookie preferences"). An earlier accept stays in
   * force — loaded analytics keep running — until the visitor declines.
   */
  reopenBanner: () => void;
  /**
   * Analytics loaders call this once they have run in this document, so a
   * later decline knows there is something to withdraw.
   */
  markAnalyticsLoaded: () => void;
}

/**
 * Default value doubles as the no-provider fallback (isolated component
 * tests, consent-free boards): consent is never required, the banner never
 * opens, and the actions are inert.
 */
const CookieConsentContext = createContext<CookieConsentState>({
  required: false,
  consentSource: 'cavuno',
  allowed: true,
  adsAllowed: true,
  choice: null,
  bannerOpen: false,
  accept: () => {},
  deny: () => {},
  reopenBanner: () => {},
  markAnalyticsLoaded: () => {},
});

export function useCookieConsent(): CookieConsentState {
  return useContext(CookieConsentContext);
}

/** The banner text as shown: operator wording, else the message catalog. */
function cookieBannerCopy(): CookieBannerCopy {
  // Operator wording baked at migration wins over the catalog; the gate itself
  // (`analytics.cookieConsentRequired`) still comes from the board API.
  const copy = chromeCookieConsent();
  return {
    title: copy.title ?? m.cookieConsent_title(),
    description: copy.description ?? m.cookieConsent_description(),
    acceptLabel: copy.acceptLabel ?? m.cookieConsent_acceptLabel(),
    denyLabel: copy.denyLabel ?? m.cookieConsent_denyLabel(),
  };
}

/** UUID v4 from raw random bytes (RFC 9562 version and variant bits). */
function uuidFromRandomBytes(): string {
  const hex = Array.from(
    crypto.getRandomValues(new Uint8Array(16)),
    (byte, i) =>
      (i === 6 ? (byte & 0x0f) | 0x40 : i === 8 ? (byte & 0x3f) | 0x80 : byte)
        .toString(16)
        .padStart(2, '0'),
  ).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** `crypto.randomUUID` is missing outside secure contexts (plain-http dev). */
function newConsentId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return uuidFromRandomBytes();
  }
}

type RecordConsent = (input: RecordConsentInput) => void;

type WithdrawAnalytics = (options?: { keepAdSense?: boolean }) => void;

function recordBoardConsent(input: RecordConsentInput) {
  analytics.recordConsent(input);
}

const NO_TRACKERS: CookieBannerTrackers = {
  cavunoAnalytics: false,
  ga4: false,
  gtm: false,
  metaPixel: false,
  linkedInInsight: false,
  adsense: false,
};

function persistChoice(choice: CookieConsentChoice, consentId: string) {
  document.cookie = serializeCookieConsent(choice, consentId);
  try {
    localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    // localStorage may be blocked; cookie is the source of truth.
  }
}

/** Reopen: no choice in force; the id and last choice stay in the cookie. */
function clearPersistedChoice(
  lastChoice: CookieConsentChoice | null,
  consentId: string | null,
) {
  document.cookie = lastChoice
    ? serializeReopenedCookieConsent(lastChoice, consentId)
    : clearCookieConsent();
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Site-wide cookie-consent state for boards whose operator enabled
 * "cookie consent required" (`board.analytics.cookieConsentRequired`).
 *
 * Choice is resolved client-side after mount so SSR and the first client
 * render are identical: no banner, no footer preferences action. A brief
 * post-hydration pop-in is accepted and standard for consent UIs. The
 * public document can then be edge-cached without varying on the cookie.
 *
 * On mount: `document.cookie` via `readCookieConsent`, then the
 * localStorage mirror (migrated to the cookie), else `null` (undecided).
 *
 * Proof of consent: each Accept / Decline made in this tab is recorded with
 * `analytics.recordConsent` under a random consent id kept in the consent
 * cookie (created on the first choice, kept across reopens), with the
 * banner version (copy + trackers) the visitor saw. A Decline whose
 * previous choice was Accept records `withdrawn`, otherwise `denied`.
 * Nothing is recorded on page load, for choices made in another tab, on
 * working-preview hosts, or without a `pk_` key. The choice is saved first;
 * recording can never block it.
 *
 * Google's consent message (`ads.googleConsentMessage`, from the
 * surrounding `BoardAdsProvider`): AdSense loads on page load on every
 * route and the
 * source starts `pending` (no banner, no trackers). Google's CMP reporting
 * `gdprApplies: true` puts Google in charge: the board's banner never
 * shows, the trackers follow `trackersAllowedFromTcData`, and "Cookie
 * preferences" reopens Google's message. `gdprApplies: false`, a blocked
 * AdSense loader, or no answer within 3 s hands over to the board's banner
 * as usual. A late `gdprApplies: true` still takes over while the visitor
 * has not answered the board's banner. Each answer in Google's message
 * (`useractioncomplete`, never page load) is recorded as accepted, denied
 * or withdrawn (a decline after trackers were allowed or ran), under a consent id
 * kept in its own cookie, with `googleConsentMessageVersion`. A decline
 * after trackers ran withdraws them like a decline on the board's banner,
 * and other tabs stop Cavuno Analytics as for a cross-tab decline. A late
 * takeover whose stored answer (`tcloaded`) refuses trackers the fallback
 * already ran withdraws them too, unrecorded (never two reloads in a row).
 */
export function CookieConsentProvider({
  required,
  publishableKey = '',
  trackers = NO_TRACKERS,
  withdrawAnalytics = withdrawLoadedAnalytics,
  recordConsent = recordBoardConsent,
  hostname,
  children,
}: {
  required: boolean;
  /** Board publishable key (`pk_…`), the one Cavuno Analytics uses. */
  publishableKey?: string;
  /** Trackers an accept turns on; part of the recorded banner version. */
  trackers?: CookieBannerTrackers;
  /** Test seam; runtime clears analytics cookies and reloads. */
  withdrawAnalytics?: WithdrawAnalytics;
  /** Test seam; runtime is `analytics.recordConsent`. */
  recordConsent?: RecordConsent;
  /** Test seam; runtime defaults to the current document host. */
  hostname?: string;
  children: ReactNode;
}) {
  // Google's CMP governs ads (and EEA consent) on this board.
  const googleMode = useBoardAds().googleConsentMessage === true;
  const [choice, setChoice] = useState<CookieConsentChoice | null | undefined>(
    undefined,
  );
  const [consentSource, setConsentSource] = useState<ConsentSource>(
    googleMode ? 'pending' : 'cavuno',
  );
  // The visitor's answer in Google's message; undefined until there is one.
  const [googleAllowed, setGoogleAllowed] = useState<boolean | undefined>();
  // Mirrors for the CMP callback, which outlives renders.
  const choiceRef = useRef(choice);
  useEffect(() => {
    choiceRef.current = choice;
  }, [choice]);
  const sourceRef = useRef(consentSource);
  // The last answer Google's message reported (tcloaded/useractioncomplete).
  const googleDecisionRef = useRef<boolean | undefined>(undefined);
  // Fallbacks for when the cookie cannot be written (blocked cookies): the
  // cookie stays the source of truth whenever it holds a value.
  const consentIdRef = useRef<string | null>(null);
  const lastChoiceRef = useRef<CookieConsentChoice | null>(null);
  // Whether any tracker (Cavuno Analytics or a third-party tag) has run in
  // this document. Loaded trackers cannot be unloaded, so a decline after
  // one ran withdraws: clear their cookies and reload without them.
  const analyticsLoaded = useRef(false);
  const markAnalyticsLoaded = useCallback(() => {
    analyticsLoaded.current = true;
  }, []);
  // Stop trackers this document loaded; the choice is already persisted.
  // AdSense cookies stay when Google's message governs ads.
  const withdrawIfLoaded = useCallback(() => {
    if (!analyticsLoaded.current) return;
    analyticsLoaded.current = false;
    withdrawAnalytics({ keepAdSense: googleMode });
  }, [withdrawAnalytics, googleMode]);

  useEffect(() => {
    const fromCookie = readCookieConsent(document.cookie);
    if (fromCookie !== null) {
      consentIdRef.current = fromCookie.consentId;
      lastChoiceRef.current = fromCookie.lastChoice;
      setChoice(fromCookie.choice);
      return;
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'accepted' || stored === 'denied') {
        document.cookie = serializeCookieConsent(stored);
        lastChoiceRef.current = stored;
        setChoice(stored);
        return;
      }
    } catch {
      // localStorage may be blocked; cookie is the source of truth.
    }
    setChoice(null);
  }, []);

  // A choice made in another tab applies here too. On a decline there,
  // Cavuno Analytics in this tab stops at once (kill switch, lifted again
  // by an accept) and the
  // analytics cookies are cleared. Third-party tags already loaded in this
  // tab keep running until its next full page load: no reload, so nothing
  // the visitor typed is lost. (`null` is a reopen elsewhere: the earlier
  // choice stands here.)
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      // A decline in Google's message in another tab.
      if (event.key === GOOGLE_DECLINE_STORAGE_KEY) {
        window.__cavunoAnalyticsOff = true;
        clearAnalyticsCookies({ keepAdSense: googleMode });
      }
      if (event.key !== STORAGE_KEY) return;
      if (event.newValue === 'accepted') {
        window.__cavunoAnalyticsOff = false;
        setChoice('accepted');
      }
      if (event.newValue === 'denied') {
        setChoice('denied');
        window.__cavunoAnalyticsOff = true;
        clearAnalyticsCookies({ keepAdSense: googleMode });
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [googleMode]);

  // A declined visitor carries no analytics cookies. Swept on every load,
  // not only at withdrawal: trackers rewrite some cookies as the withdrawn
  // document unloads (GA4's `_ga_<ID>` session cookie on pagehide), so
  // the reloaded document finishes the job.
  useEffect(() => {
    const declined =
      consentSource === 'google'
        ? googleAllowed === false && googleDecisionRef.current === false
        : consentSource === 'cavuno' && required && choice === 'denied';
    if (declined) clearAnalyticsCookies({ keepAdSense: googleMode });
  }, [consentSource, googleAllowed, required, choice, googleMode]);

  // Save a choice made in this tab; returns the previous choice and the id.
  const saveChoice = useCallback((next: CookieConsentChoice) => {
    const stored = readCookieConsent(document.cookie);
    const previous = stored?.lastChoice ?? lastChoiceRef.current;
    const consentId =
      stored?.consentId ?? consentIdRef.current ?? newConsentId();
    consentIdRef.current = consentId;
    lastChoiceRef.current = next;
    persistChoice(next, consentId);
    setChoice(next);
    return { previous, consentId };
  }, []);

  // Proof of consent, after the choice is saved. Never throws.
  const send = useCallback(
    (
      consentChoice: RecordConsentInput['choice'],
      consentId: string,
      bannerVersion: string,
    ) => {
      if (!publishableKey.startsWith('pk_')) return;
      if (isWorkingPreviewHostname(hostname ?? window.location.hostname)) {
        return;
      }
      try {
        recordConsent({
          publishableKey,
          consentId,
          choice: consentChoice,
          bannerVersion,
        });
      } catch (error) {
        console.warn('Could not record the cookie-consent choice', error);
      }
    },
    [publishableKey, hostname, recordConsent],
  );

  const record = useCallback(
    (consentChoice: RecordConsentInput['choice'], consentId: string) => {
      if (!required) return;
      send(
        consentChoice,
        consentId,
        cookieBannerVersion(cookieBannerCopy(), trackers),
      );
    },
    [required, send, trackers],
  );

  const onGoogleConsent = useCallback(
    (update: GoogleConsentUpdate, tcf: GoogleTcf | null) => {
      // Trackers the fallback banner let run make a decline a withdrawal.
      const step = tcf?.googleConsentStep(
        update,
        googleDecisionRef.current || analyticsLoaded.current,
        trackers,
      );
      if (!tcf || !step || step.kind === 'fallback') {
        if (sourceRef.current === 'pending') {
          sourceRef.current = 'cavuno';
          setConsentSource('cavuno');
        }
        return;
      }
      // Fell back and the visitor already answered the board's banner:
      // that answer stands for this document.
      const ownChoice = choiceRef.current;
      if (
        sourceRef.current === 'cavuno' &&
        (ownChoice === 'accepted' || ownChoice === 'denied')
      ) {
        return;
      }
      sourceRef.current = 'google';
      setConsentSource('google');
      if (step.kind === 'shown') {
        setGoogleAllowed(googleDecisionRef.current ?? false);
        return;
      }
      googleDecisionRef.current = step.allowed;
      setGoogleAllowed(step.allowed);
      if (!step.record) {
        // A stored refusal reported after the fallback let trackers run:
        // withdraw them as for a decline, but record nothing (no action).
        if (!step.allowed && analyticsLoaded.current) {
          if (tcf.claimLateWithdrawalReload()) {
            withdrawIfLoaded();
          } else {
            window.__cavunoAnalyticsOff = true;
            clearAnalyticsCookies({ keepAdSense: googleMode });
          }
        }
        return;
      }
      // Its own id cookie: the consent cookie may not exist.
      const consentId = tcf.googleConsentId(consentIdRef.current, newConsentId);
      consentIdRef.current = consentId;
      send(step.record.choice, consentId, step.record.bannerVersion);
      if (step.allowed) {
        window.__cavunoAnalyticsOff = false;
      } else {
        tcf.broadcastGoogleDecline();
        withdrawIfLoaded();
      }
    },
    [send, trackers, withdrawIfLoaded, googleMode],
  );

  // Subscribed once per document; the handler is read through a ref.
  const onGoogleConsentRef = useRef(onGoogleConsent);
  useEffect(() => {
    onGoogleConsentRef.current = onGoogleConsent;
  }, [onGoogleConsent]);
  const googleTcfRef = useRef<GoogleTcf | null>(null);
  useEffect(() => {
    if (!googleMode) return;
    const unavailable = () =>
      onGoogleConsentRef.current({ kind: 'unavailable' }, null);
    // Working previews never load AdSense, so Google's CMP never comes.
    if (isWorkingPreviewHostname(hostname ?? window.location.hostname)) {
      unavailable();
      return;
    }
    let active = true;
    let unsubscribe: (() => void) | undefined;
    import('@/lib/google-tcf').then(
      (tcf) => {
        if (!active) return;
        googleTcfRef.current = tcf;
        unsubscribe = tcf.subscribeGoogleConsent((update) =>
          onGoogleConsentRef.current(update, tcf),
        );
      },
      () => {
        if (active) unavailable();
      },
    );
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [googleMode, hostname]);

  const ownAllowed = !required || choice === 'accepted';
  const allowed =
    consentSource === 'google'
      ? googleAllowed === true
      : consentSource === 'cavuno' && ownAllowed;

  const value = useMemo<CookieConsentState>(
    () => ({
      required,
      consentSource,
      allowed,
      adsAllowed: googleMode || ownAllowed,
      choice,
      // Undetermined (`undefined`) must match SSR: no banner until mount.
      bannerOpen: consentSource === 'cavuno' && required && choice === null,
      accept: () => {
        window.__cavunoAnalyticsOff = false;
        const { consentId } = saveChoice('accepted');
        record('accepted', consentId);
      },
      deny: () => {
        const { previous, consentId } = saveChoice('denied');
        // Issued before the withdrawal reload; the SDK sends it with
        // `keepalive`, so the request outlives this document.
        record(previous === 'accepted' ? 'withdrawn' : 'denied', consentId);
        withdrawIfLoaded();
      },
      reopenBanner: () => {
        if (consentSource === 'google') {
          googleTcfRef.current?.showGoogleConsentMessage();
          return;
        }
        const stored = readCookieConsent(document.cookie);
        clearPersistedChoice(
          stored?.lastChoice ?? lastChoiceRef.current,
          stored?.consentId ?? consentIdRef.current,
        );
        setChoice(null);
      },
      markAnalyticsLoaded,
    }),
    [
      required,
      consentSource,
      allowed,
      googleMode,
      ownAllowed,
      choice,
      saveChoice,
      record,
      withdrawIfLoaded,
      markAnalyticsLoaded,
    ],
  );

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
    </CookieConsentContext.Provider>
  );
}

/**
 * The bottom-corner accept/deny banner. Occupies the same floating-stack
 * slot as the job-alert prompt (which hides itself while this is open) and
 * stays until the visitor decides — no dismiss without a choice, since the
 * choice is what gates the analytics scripts.
 */
export function CookieConsentBanner() {
  const { bannerOpen, accept, deny } = useCookieConsent();
  const copy = cookieBannerCopy();

  if (!bannerOpen) return null;

  return (
    <FloatingStackItem order={10} className="w-80 max-w-[calc(100vw-2rem)]">
      <section
        aria-label={m.cookieConsent_regionAriaLabel()}
        data-test="cookie-consent-banner"
      >
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>
              <h2 className="text-foreground flex items-center gap-2 text-base font-semibold">
                <CookieIcon
                  className="text-primary size-4"
                  aria-hidden="true"
                />
                {copy.title}
              </h2>
            </CardTitle>
            <CardDescription>
              {copy.description}{' '}
              <Link
                to="/cookie-policy"
                className="text-foreground underline underline-offset-4"
              >
                {footerCopy().cookiePolicyLabel}
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button type="button" className="flex-1" onClick={accept}>
                {copy.acceptLabel}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={deny}
              >
                {copy.denyLabel}
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </FloatingStackItem>
  );
}

/**
 * The footer's "Cookie preferences" entry — rendered only after a choice
 * exists to revisit. Clears the saved choice, which immediately reopens the
 * banner; trackers an earlier accept loaded keep running until a decline.
 * When Google's consent message is in charge it is always shown and
 * reopens Google's message instead.
 * Styled to sit among the footer's legal links.
 */
export function CookiePreferencesFooterAction() {
  const { required, choice, consentSource, reopenBanner } = useCookieConsent();

  const ownChoice =
    consentSource === 'cavuno' &&
    required &&
    (choice === 'accepted' || choice === 'denied');
  if (consentSource !== 'google' && !ownChoice) return null;

  return (
    <button
      type="button"
      onClick={reopenBanner}
      className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 rounded-sm text-sm transition-colors outline-none focus-visible:ring-2"
    >
      {chromeCookieConsent().preferencesLabel ??
        m.cookieConsent_preferencesLabel()}
    </button>
  );
}
