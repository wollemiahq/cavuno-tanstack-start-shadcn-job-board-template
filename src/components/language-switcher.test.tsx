// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import type { ReactElement } from 'react';

/**
 * Chrome language switcher. Hidden while only English is compiled.
 * Enabling a second locale (`pnpm locale:add de`) makes it appear.
 * These tests pin the locale-resolution contract, that extra locales
 * never include the en-XA pseudo-locale, path preservation, and that
 * the trigger stays visible while the lazy menu chunk loads.
 */
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from '@tanstack/react-router';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { publicLocales } from '../lib/public-locales';
import { baseLocale, locales, overwriteGetLocale } from '../paraglide/runtime';
import {
  LOCALE_ENDONYMS,
  LanguageSwitcher,
  LanguageSwitcherPanel,
  buildLocaleOptions,
  publicChromeLocales,
} from './language-switcher';

vi.mock('@/paraglide/messages', () => ({
  m: { languageSwitcher_label: () => 'Fixture locale selector' },
}));

// The options below cover a board that compiles en, de, fr and nl; the
// build keeps URL words for compiled locales only.
vi.mock('virtual:url-words', async () => {
  const words = (await import('../url-words.json')).default;
  return { default: { de: words.de, fr: words.fr, nl: words.nl } };
});

// Delay the real lazy chunk by a macrotask so the Suspense fallback remains
// observable without replacing the module under test.
const delayedMenuLoader = async () => {
  await new Promise((resolve) => setTimeout(resolve, 50));
  return import('./language-switcher-menu');
};

afterEach(() => {
  overwriteGetLocale(() => baseLocale);
  cleanup();
});

describe('locale-resolution contract', () => {
  it('public chrome excludes QA pseudo-locales', () => {
    expect(publicChromeLocales()).toEqual(publicLocales([...locales]));
    expect(publicLocales([...locales])).not.toContain('en-XA');
  });

  it('labels known languages in their own tongue (endonyms)', () => {
    expect(LOCALE_ENDONYMS.get('en')).toBe('English');
    expect(LOCALE_ENDONYMS.get('de')).toBe('Deutsch');
    expect(LOCALE_ENDONYMS.get('fr')).toBe('Français');
  });
});

/**
 * The base locale serves the canonical, unprefixed path; every other locale
 * is prefixed and uses its own section slug. Which locale is the base is a
 * board choice, so expectations follow `baseLocale` instead of assuming one.
 */
function expectedHref(locale: string, prefixed: string) {
  if (locale !== baseLocale) return prefixed;
  return prefixed.slice(locale.length + 1) || '/';
}

describe('buildLocaleOptions preserves the current path', () => {
  const extra = ['en', 'de', 'fr'] as const;

  it('re-localizes the active path per option, keeping the query', () => {
    const options = buildLocaleOptions('en', '/jobs?q=react', [...extra, 'nl']);
    const byLocale = Object.fromEntries(options.map((o) => [o.locale, o.href]));
    expect(byLocale.en).toBe(expectedHref('en', '/en/jobs?q=react'));
    expect(byLocale.de).toBe(expectedHref('de', '/de/jobs?q=react'));
    expect(byLocale.fr).toBe(expectedHref('fr', '/fr/emplois?q=react'));
    expect(byLocale.nl).toBe(expectedHref('nl', '/nl/vacatures?q=react'));
  });

  it('marks the active locale and nothing else', () => {
    const options = buildLocaleOptions('de', '/companies', extra);
    expect(options.filter((o) => o.active).map((o) => o.locale)).toEqual([
      'de',
    ]);
    expect(options.find((o) => o.locale === 'de')?.href).toBe(
      expectedHref('de', '/de/unternehmen'),
    );
    expect(options.find((o) => o.locale === 'en')?.href).toBe(
      expectedHref('en', '/en/companies'),
    );
  });
});

function renderAt(path: string, ui: ReactElement = <LanguageSwitcher />) {
  const rootRoute = createRootRoute({ component: () => ui });
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  return render(<RouterProvider router={router} />);
}

describe('LanguageSwitcher rendering', () => {
  it('renders nothing when only one public locale is compiled', async () => {
    overwriteGetLocale(() => 'en');
    renderAt('/jobs');
    expect(
      screen.queryByRole('button', { name: 'Fixture locale selector' }),
    ).toBeNull();
    expect(
      document.querySelector('[data-test="language-switcher"]'),
    ).toBeNull();
  });

  it('keeps the trigger visible while the menu chunk loads', async () => {
    overwriteGetLocale(() => 'en');
    const options = buildLocaleOptions('en', '/jobs', ['en', 'de', 'fr']);
    renderAt(
      '/jobs',
      <LanguageSwitcherPanel
        options={options}
        menuLoader={delayedMenuLoader}
      />,
    );
    const trigger = await screen.findByRole('button', {
      name: 'Fixture locale selector',
    });

    fireEvent.click(trigger);

    const pill = document.querySelector('[data-test="language-switcher"]');
    expect(pill).not.toBeNull();
    expect(pill).toHaveTextContent('English');

    await waitFor(() => screen.getByRole('menu'));
  });

  it('shows the active language on the trigger and the extra options marked', async () => {
    overwriteGetLocale(() => 'en');
    const options = buildLocaleOptions('de', '/jobs', ['en', 'de', 'fr']);
    renderAt('/jobs', <LanguageSwitcherPanel options={options} />);
    const trigger = await screen.findByRole('button', {
      name: 'Fixture locale selector',
    });
    expect(trigger).toHaveTextContent('Deutsch');

    fireEvent.click(trigger);

    const menu = await waitFor(() => screen.getByRole('menu'));
    for (const label of ['English', 'Deutsch', 'Français']) {
      expect(within(menu).getByText(label)).toBeInTheDocument();
    }
    const current = within(menu)
      .getByText('Deutsch')
      .closest('[aria-current="true"]');
    expect(current).not.toBeNull();
    expect(current).toHaveAttribute('href', expectedHref('de', '/de/jobs'));
    expect(within(menu).getByText('English').closest('a')).toHaveAttribute(
      'href',
      expectedHref('en', '/en/jobs'),
    );
  });
});
