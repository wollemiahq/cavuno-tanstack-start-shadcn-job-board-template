/**
 * Chrome-locale switcher. Switches only the Paraglide UI locale
 * via the URL prefix (`/de/`, `/fr/`); the board's content language is
 * unaffected — jobs, companies, and blog stay in the board's single
 * language while labels, nav, and headings follow the chosen locale.
 *
 * Hidden while only one public locale is compiled (the default: English).
 * Enabling a second locale (`pnpm locale:add de`) makes this appear.
 *
 * Each option is a real anchor to the localized version of the CURRENT
 * path (`localizeHref(href, { locale })`), so a switch is a full document
 * load: `paraglideMiddleware` resolves the locale server-side, `getLocale()`
 * feeds the copy seam, and there is no flash of the wrong language. Real
 * hrefs (not client-only handlers) keep the alternates crawlable and let
 * each carry an `hrefLang` hint. The base locale is served unprefixed.
 */
import { lazy, Suspense, useMemo, useState, type ComponentType } from 'react';

import { useRouterState } from '@tanstack/react-router';
import { ChevronDown, Globe } from 'lucide-react';

import { localizePath } from '../lib/localized-path';
import { publicLocales } from '../lib/public-locales';
import { m } from '../paraglide/messages';
import { getLocale, locales } from '../paraglide/runtime';

import type { LanguageSwitcherMenuProps } from './language-switcher-menu';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type LanguageSwitcherMenuLoader = () => Promise<{
  LanguageSwitcherMenu: ComponentType<LanguageSwitcherMenuProps>;
}>;

const loadMenu: LanguageSwitcherMenuLoader = () =>
  import('./language-switcher-menu');

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
 * Endonyms — each language named in its own tongue (i18n convention).
 * These are proper nouns, identical in every locale, so they live in code
 * rather than the per-locale message catalogs (and never translate).
 * Unknown locales fall back to the BCP-47 tag.
 */
export const LOCALE_ENDONYMS = new Map([
  ['en', 'English'],
  ['de', 'Deutsch'],
  ['fr', 'Français'],
  ['es', 'Español'],
  ['it', 'Italiano'],
  ['nl', 'Nederlands'],
  ['pt', 'Português'],
  ['pl', 'Polski'],
]);

export function localeEndonym(locale: string): string {
  return LOCALE_ENDONYMS.get(locale) ?? locale;
}

export function publicChromeLocales(): string[] {
  return publicLocales(locales);
}

export interface LocaleOption {
  locale: string;
  label: string;
  /** The current path re-localized to this option's locale. */
  href: string;
  active: boolean;
}

/**
 * Pure: given the active locale and the current (delocalized) href, build
 * the switcher options. Kept separate from the component so the
 * path-preserving contract is unit-testable without a DOM — pass
 * `localeCodes` to exercise extra locales without compiling them.
 */
export function buildLocaleOptions(
  activeLocale: string,
  href: string,
  localeCodes: readonly string[] = publicChromeLocales(),
): LocaleOption[] {
  return localeCodes.map((locale) => ({
    locale,
    label: localeEndonym(locale),
    href: localizePath(href, { locale }),
    active: locale === activeLocale,
  }));
}

export function LanguageSwitcherPanel({
  options,
  className,
  menuLoader = loadMenu,
}: {
  options: LocaleOption[];
  className?: string;
  menuLoader?: LanguageSwitcherMenuLoader;
}) {
  const [menuRequested, setMenuRequested] = useState(false);
  const LazyLanguageSwitcherMenu = useMemo(
    () =>
      lazy(() =>
        menuLoader().then(({ LanguageSwitcherMenu }) => ({
          default: LanguageSwitcherMenu,
        })),
      ),
    [menuLoader],
  );
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

export function LanguageSwitcher({ className }: { className?: string }) {
  // The router sees the delocalized href (rewrite.input); localizeHref
  // re-prefixes it per option. Preserves pathname + search + hash.
  const href = useRouterState({ select: (state) => state.location.href });
  const options = buildLocaleOptions(getLocale(), href);
  if (options.length < 2) return null;
  return <LanguageSwitcherPanel options={options} className={className} />;
}
