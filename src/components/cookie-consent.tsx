'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
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
import {
  clearCookieConsent,
  parseCookieConsent,
  serializeCookieConsent,
  type CookieConsentChoice,
} from '@/lib/cookie-consent';

/** Legacy localStorage key — migrated once to the consent cookie on mount. */
const STORAGE_KEY = 'cavuno:cookie-consent';

export type { CookieConsentChoice };

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
  /** Clear the saved choice and reopen the banner ("Cookie preferences"). */
  reopenBanner: () => void;
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
 * On mount: `document.cookie` via `parseCookieConsent`, then the legacy
 * localStorage key, else `null` (undecided).
 */
export function CookieConsentProvider({
  required,
  children,
}: {
  required: boolean;
  children: ReactNode;
}) {
  const [choice, setChoice] = useState<CookieConsentChoice | null | undefined>(
    undefined,
  );

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

  const value = useMemo<CookieConsentState>(
    () => ({
      required,
      choice,
      // Undetermined (`undefined`) must match SSR: no banner until mount.
      bannerOpen: required && choice === null,
      accept: () => {
        persistChoice('accepted');
        setChoice('accepted');
      },
      deny: () => {
        persistChoice('denied');
        setChoice('denied');
      },
      reopenBanner: () => {
        clearPersistedChoice();
        setChoice(null);
      },
    }),
    [required, choice],
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
                {m.cookieConsent_title()}
              </h2>
            </CardTitle>
            <CardDescription>
              {m.cookieConsent_description()}{' '}
              <Link
                to="/cookie-policy"
                className="text-foreground underline underline-offset-4"
              >
                {m.footer_cookiePolicyLabel()}
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button type="button" className="flex-1" onClick={accept}>
                {m.cookieConsent_acceptLabel()}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={deny}
              >
                {m.cookieConsent_denyLabel()}
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
 * banner. Styled to sit among the footer's legal links.
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
      {m.cookieConsent_preferencesLabel()}
    </button>
  );
}
