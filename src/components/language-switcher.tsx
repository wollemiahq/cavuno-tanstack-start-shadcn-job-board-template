/**
 * Chrome-locale switcher. Switches only the Paraglide UI locale
 * via the URL prefix (`/de/`, `/fr/`); the board's content language is
 * unaffected — jobs, companies, and blog stay in the board's single
 * language while labels, nav, and headings follow the chosen locale.
 *
 * Each option is a real anchor to the localized version of the CURRENT
 * path (`localizeHref(href, { locale })`), so a switch is a full document
 * load: `paraglideMiddleware` resolves the locale server-side, `getLocale()`
 * feeds the copy seam, and there is no flash of the wrong language. Real
 * hrefs (not client-only handlers) keep the alternates crawlable and let
 * each carry an `hrefLang` hint. The base locale is served unprefixed.
 */
import { lazy, Suspense, useState } from 'react';

import { useRouterState } from '@tanstack/react-router';
import { ChevronDown, Globe } from 'lucide-react';

import { m } from '../paraglide/messages';
import { getLocale, localizeHref } from '../paraglide/runtime';

import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const loadMenu = () => import('./language-switcher-menu');
const LazyLanguageSwitcherMenu = lazy(() =>
  loadMenu().then(({ LanguageSwitcherMenu }) => ({
    default: LanguageSwitcherMenu,
  })),
);

/**
 * The trigger pill, shared between the pre-menu button and the Suspense
 * fallback so the switcher never blinks out while the menu chunk loads —
 * the fallback is a pixel-identical (inert) twin of the button.
 */
function SwitcherPill({
  label,
  activeLabel,
  className,
  onClick,
}: {
  label: string;
  activeLabel: string;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-busy={onClick ? undefined : 'true'}
      className={cn(
        buttonVariants({ variant: 'outline', size: 'sm' }),
        'gap-2',
        className,
      )}
      data-test="language-switcher"
      onClick={onClick}
      onPointerEnter={onClick ? () => void loadMenu() : undefined}
      onFocus={onClick ? () => void loadMenu() : undefined}
    >
      <Globe className="text-muted-foreground" />
      <span>{activeLabel}</span>
      <ChevronDown className="text-muted-foreground" />
    </button>
  );
}

/**
 * The public chrome locales. `en-XA` (pseudo-accent) and `ar-XB`
 * (pseudo-bidi/RTL) are the CI pseudo-locales (QA/coverage only) and are
 * deliberately excluded from the human-facing switcher.
 */
export const PUBLIC_LOCALES = ['en', 'de', 'fr'] as const;
export type PublicLocale = (typeof PUBLIC_LOCALES)[number];

/**
 * Endonyms — each language named in its own tongue (i18n convention).
 * These are proper nouns, identical in every locale, so they live in code
 * rather than the per-locale message catalogs (and never translate).
 */
export const LOCALE_ENDONYMS: Record<PublicLocale, string> = {
  en: 'English',
  de: 'Deutsch',
  fr: 'Français',
};

export interface LocaleOption {
  locale: PublicLocale;
  label: string;
  /** The current path re-localized to this option's locale. */
  href: string;
  active: boolean;
}

/**
 * Pure: given the active locale and the current (delocalized) href, build
 * the switcher options. Kept separate from the component so the
 * path-preserving contract is unit-testable without a DOM.
 */
export function buildLocaleOptions(
  activeLocale: string,
  href: string,
): LocaleOption[] {
  return PUBLIC_LOCALES.map((locale) => ({
    locale,
    label: LOCALE_ENDONYMS[locale],
    href: localizeHref(href, { locale }),
    active: locale === activeLocale,
  }));
}

export function LanguageSwitcher({ className }: { className?: string }) {
  const [menuRequested, setMenuRequested] = useState(false);
  // The router sees the delocalized href (rewrite.input); localizeHref
  // re-prefixes it per option. Preserves pathname + search + hash.
  const href = useRouterState({ select: (state) => state.location.href });
  const activeLocale = getLocale();
  const options = buildLocaleOptions(activeLocale, href);
  const active = options.find((option) => option.active) ?? options[0]!;
  const label = m.languageSwitcher_label();

  if (menuRequested) {
    return (
      <Suspense
        fallback={
          <SwitcherPill
            label={label}
            activeLabel={active.label}
            className={className}
          />
        }
      >
        <LazyLanguageSwitcherMenu
          options={options}
          activeLabel={active.label}
          label={label}
          className={className}
        />
      </Suspense>
    );
  }

  return (
    <>
      <SwitcherPill
        label={label}
        activeLabel={active.label}
        className={className}
        onClick={() => setMenuRequested(true)}
      />
      <div hidden aria-hidden="true">
        {options.map((option) => (
          <a
            key={option.locale}
            href={option.href}
            hrefLang={option.locale}
            tabIndex={-1}
          >
            {option.label}
          </a>
        ))}
      </div>
    </>
  );
}
