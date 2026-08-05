/**
 * hreflang alternates for every locale variant of the current page, plus
 * x-default pointing at the base-locale URL. Rendered inside <head> by the
 * root document (SSR'd on the first byte, which is what crawlers read).
 * Paired with localized self-canonicals (src/lib/self-url.ts) this makes
 * /de/ and /fr/ indexable as first-class variants instead of consolidating
 * into the base locale.
 *
 * Skipped on surfaces with no SEO identity (embed iframes, the password
 * gate) and useless-but-harmless on authed pages (crawlers never see them).
 */
import { useRouterState } from '@tanstack/react-router';

import { localizePath } from '../lib/localized-path';
import { locales } from '../paraglide/runtime';

const EXCLUDED_PREFIXES = ['/embed', '/password'];

export function AlternateLinks({ origin }: { origin: string }) {
  // The router exposes the DELOCALIZED href (rewrite.input) — exactly the
  // canonical path localizeHref expects.
  const href = useRouterState({ select: (state) => state.location.href });
  const path = href.split(/[?#]/, 1)[0] ?? '/';
  if (EXCLUDED_PREFIXES.some((prefix) => path.startsWith(prefix))) return null;
  return (
    <>
      {locales.map((locale) => (
        <link
          key={locale}
          rel="alternate"
          hrefLang={locale}
          href={`${origin}${localizePath(path, { locale })}`}
        />
      ))}
      <link rel="alternate" hrefLang="x-default" href={`${origin}${path}`} />
    </>
  );
}
