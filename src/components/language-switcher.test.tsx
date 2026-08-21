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

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Delay the lazy menu chunk by a real macrotask so tests can observe the
// Suspense window — in bare jsdom the import resolves inside the click's
// act() and the fallback would never be visible to assertions.
vi.mock('./language-switcher-menu', async (importActual) => {
  await new Promise((resolve) => setTimeout(resolve, 50));
  return importActual();
});

afterEach(() => {
  overwriteGetLocale(() => baseLocale);
  cleanup();
});

describe('locale-resolution contract', () => {
  it('resolves the locale from the URL, base locale unprefixed', () => {
    const viteConfig = readFileSync(
      join(import.meta.dirname, '..', '..', 'vite.config.ts'),
      'utf8',
    );
    expect(viteConfig).toMatch(/strategy:\s*\[[^\]]*'url'/);
    expect(baseLocale).toBe('en');
  });

  it('production compiles English only — never the en-XA QA pseudo-locale', () => {
    expect([...locales]).toEqual(['en']);
    expect(publicChromeLocales()).toEqual(['en']);
    expect(publicLocales([...locales])).not.toContain('en-XA');
  });

  it('labels known languages in their own tongue (endonyms)', () => {
    expect(LOCALE_ENDONYMS.en).toBe('English');
    expect(LOCALE_ENDONYMS.de).toBe('Deutsch');
    expect(LOCALE_ENDONYMS.fr).toBe('Français');
  });
});

describe('buildLocaleOptions preserves the current path', () => {
  const extra = ['en', 'de', 'fr'] as const;

  it('re-localizes the active path per option, keeping the query', () => {
    const options = buildLocaleOptions('en', '/jobs?q=react', extra);
    const byLocale = Object.fromEntries(options.map((o) => [o.locale, o.href]));
    expect(byLocale.en).toBe('/jobs?q=react');
    expect(byLocale.de).toBe('/de/jobs?q=react');
    expect(byLocale.fr).toBe('/fr/emplois?q=react');
  });

  it('marks the active locale and nothing else', () => {
    const options = buildLocaleOptions('de', '/companies', extra);
    expect(options.filter((o) => o.active).map((o) => o.locale)).toEqual([
      'de',
    ]);
    expect(options.find((o) => o.locale === 'de')?.href).toBe(
      '/de/unternehmen',
    );
    expect(options.find((o) => o.locale === 'en')?.href).toBe('/companies');
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
    expect(screen.queryByRole('button', { name: 'Language' })).toBeNull();
    expect(
      document.querySelector('[data-test="language-switcher"]'),
    ).toBeNull();
  });

  it('keeps the trigger visible while the menu chunk loads', async () => {
    overwriteGetLocale(() => 'en');
    const options = buildLocaleOptions('en', '/jobs', ['en', 'de', 'fr']);
    renderAt('/jobs', <LanguageSwitcherPanel options={options} />);
    const trigger = await screen.findByRole('button', { name: 'Language' });

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
    const trigger = await screen.findByRole('button', { name: 'Language' });
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
    expect(current).toHaveAttribute('href', '/de/jobs');
    expect(within(menu).getByText('English').closest('a')).toHaveAttribute(
      'href',
      '/jobs',
    );
  });
});
