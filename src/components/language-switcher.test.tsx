// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
/**
 * Chrome language switcher. The switcher flips only the
 * Paraglide UI locale via the URL prefix; board content stays in the
 * board's single language. These tests pin the locale-resolution
 * contract, the three public options (never the en-XA pseudo-locale),
 * the current-locale marker, and that switching preserves the route path.
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
import { afterEach, describe, expect, it } from 'vitest';

import { baseLocale, locales, overwriteGetLocale } from '../paraglide/runtime';
import {
  LOCALE_ENDONYMS,
  PUBLIC_LOCALES,
  buildLocaleOptions,
  LanguageSwitcher,
} from './language-switcher';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

afterEach(() => {
  overwriteGetLocale(() => baseLocale);
  cleanup();
});

describe('locale-resolution contract', () => {
  it('resolves the locale from the URL, base locale unprefixed', () => {
    // SSR correctness on Workers hinges on the URL strategy: the switcher's
    // full-nav anchors only render the right chrome if the middleware reads
    // the locale from the path. The paraglide vite plugin is the source of
    // truth for the request-time strategy (the CLI-compiled runtime carries
    // a different default). `baseLocale` (=== board language) serves
    // unprefixed.
    const viteConfig = readFileSync(
      join(import.meta.dirname, '..', '..', 'vite.config.ts'),
      'utf8',
    );
    expect(viteConfig).toMatch(/strategy:\s*\[[^\]]*'url'/);
    expect(baseLocale).toBe('en');
  });

  it('offers exactly en/de/fr — never the en-XA QA pseudo-locale', () => {
    expect([...PUBLIC_LOCALES]).toEqual(['en', 'de', 'fr']);
    // Prod Paraglide runtime ships only the public chrome locales.
    // en-XA / ar-XB compile in only under the QA enable script + rebuild.
    expect([...locales]).toEqual(['en', 'de', 'fr']);
    expect([...PUBLIC_LOCALES]).not.toContain('en-XA');
  });

  it('labels each language in its own tongue (endonyms)', () => {
    expect(LOCALE_ENDONYMS).toEqual({
      en: 'English',
      de: 'Deutsch',
      fr: 'Français',
    });
  });
});

describe('buildLocaleOptions preserves the current path', () => {
  it('re-localizes the active path per option, keeping the query', () => {
    const options = buildLocaleOptions('en', '/jobs?q=react');
    const byLocale = Object.fromEntries(options.map((o) => [o.locale, o.href]));
    // Base locale stays unprefixed; others gain their prefix — same path.
    expect(byLocale.en).toBe('/jobs?q=react');
    expect(byLocale.de).toBe('/de/jobs?q=react');
    expect(byLocale.fr).toBe('/fr/jobs?q=react');
  });

  it('marks the active locale and nothing else', () => {
    const options = buildLocaleOptions('de', '/companies');
    expect(options.filter((o) => o.active).map((o) => o.locale)).toEqual([
      'de',
    ]);
    // Switching away from /de/companies re-derives from the delocalized
    // path the router exposes, so every option targets the same route.
    expect(options.find((o) => o.locale === 'de')?.href).toBe('/de/companies');
    expect(options.find((o) => o.locale === 'en')?.href).toBe('/companies');
  });
});

function renderAt(path: string) {
  const rootRoute = createRootRoute({ component: () => <LanguageSwitcher /> });
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  return render(<RouterProvider router={router} />);
}

describe('LanguageSwitcher rendering', () => {
  it('shows the active language on the trigger and the three options marked', async () => {
    overwriteGetLocale(() => 'de');
    renderAt('/jobs');
    const trigger = await screen.findByRole('button', { name: 'Sprache' });
    // Trigger reflects the current locale + carries the localized aria-label.
    expect(trigger).toHaveTextContent('Deutsch');

    fireEvent.click(trigger);

    const menu = await waitFor(() => screen.getByRole('menu'));
    for (const label of ['English', 'Deutsch', 'Français']) {
      expect(within(menu).getByText(label)).toBeInTheDocument();
    }
    // Current locale indicated via aria-current on its item's anchor.
    const current = within(menu)
      .getByText('Deutsch')
      .closest('[aria-current="true"]');
    expect(current).not.toBeNull();
    expect(current).toHaveAttribute('href', '/de/jobs');
    // The switch-to-English option preserves the path, unprefixed.
    expect(within(menu).getByText('English').closest('a')).toHaveAttribute(
      'href',
      '/jobs',
    );
  });
});
