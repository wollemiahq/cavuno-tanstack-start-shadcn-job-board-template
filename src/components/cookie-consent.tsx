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

import { Link } from '@tanstack/react-router';
import { CookieIcon } from 'lucide-react';

import { m } from '../paraglide/messages';

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
  parseCookieConsent,
  serializeCookieConsent,
  type CookieConsentChoice,
} from '@/lib/cookie-consent';
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

interface CookieConsentState {
  /** The board's `analytics.cookieConsentRequired` flag. */
  required: boolean;
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

function persistChoice(choice: CookieConsentChoice) {
  document.cookie = serializeCookieConsent(choice);
  try {
    localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    // localStorage may be blocked; cookie is the source of truth.
  }
}

function clearPersistedChoice() {
  document.cookie = clearCookieConsent();
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
 * On mount: `document.cookie` via `parseCookieConsent`, then the
 * localStorage mirror (migrated to the cookie), else `null` (undecided).
 */
export function CookieConsentProvider({
  required,
  withdrawAnalytics = withdrawLoadedAnalytics,
  children,
}: {
  required: boolean;
  /** Test seam; runtime clears analytics cookies and reloads. */
  withdrawAnalytics?: () => void;
  children: ReactNode;
}) {
  const [choice, setChoice] = useState<CookieConsentChoice | null | undefined>(
    undefined,
  );
  // Whether any tracker (Cavuno Analytics or a third-party tag) has run in
  // this document. Loaded trackers cannot be unloaded, so a decline after
  // one ran withdraws: clear their cookies and reload without them.
  const analyticsLoaded = useRef(false);
  const markAnalyticsLoaded = useCallback(() => {
    analyticsLoaded.current = true;
  }, []);
  // Stop trackers this document loaded; the choice is already persisted.
  const withdrawIfLoaded = useCallback(() => {
    if (!analyticsLoaded.current) return;
    analyticsLoaded.current = false;
    withdrawAnalytics();
  }, [withdrawAnalytics]);

  useEffect(() => {
    const fromCookie = parseCookieConsent(document.cookie);
    if (fromCookie !== null) {
      setChoice(fromCookie);
      return;
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'accepted' || stored === 'denied') {
        document.cookie = serializeCookieConsent(stored);
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
      if (event.key !== STORAGE_KEY) return;
      if (event.newValue === 'accepted') {
        window.__cavunoAnalyticsOff = false;
        setChoice('accepted');
      }
      if (event.newValue === 'denied') {
        setChoice('denied');
        window.__cavunoAnalyticsOff = true;
        clearAnalyticsCookies();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // A declined visitor carries no analytics cookies. Swept on every load,
  // not only at withdrawal: trackers rewrite some cookies as the withdrawn
  // document unloads (GA4's `_ga_<ID>` session cookie on pagehide), so
  // the reloaded document finishes the job.
  useEffect(() => {
    if (required && choice === 'denied') clearAnalyticsCookies();
  }, [required, choice]);

  const value = useMemo<CookieConsentState>(
    () => ({
      required,
      choice,
      // Undetermined (`undefined`) must match SSR: no banner until mount.
      bannerOpen: required && choice === null,
      accept: () => {
        window.__cavunoAnalyticsOff = false;
        persistChoice('accepted');
        setChoice('accepted');
      },
      deny: () => {
        persistChoice('denied');
        setChoice('denied');
        withdrawIfLoaded();
      },
      reopenBanner: () => {
        clearPersistedChoice();
        setChoice(null);
      },
      markAnalyticsLoaded,
    }),
    [required, choice, withdrawIfLoaded, markAnalyticsLoaded],
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
  // Operator wording baked at migration wins over the catalog; the gate itself
  // (`analytics.cookieConsentRequired`) still comes from the board API.
  const copy = chromeCookieConsent();

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
                {copy.title ?? m.cookieConsent_title()}
              </h2>
            </CardTitle>
            <CardDescription>
              {copy.description ?? m.cookieConsent_description()}{' '}
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
                {copy.acceptLabel ?? m.cookieConsent_acceptLabel()}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={deny}
              >
                {copy.denyLabel ?? m.cookieConsent_denyLabel()}
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
 * Styled to sit among the footer's legal links.
 */
export function CookiePreferencesFooterAction() {
  const { required, choice, reopenBanner } = useCookieConsent();

  if (!required || (choice !== 'accepted' && choice !== 'denied')) return null;

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
