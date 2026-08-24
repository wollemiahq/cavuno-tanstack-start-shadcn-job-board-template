/**
 * hreflang alternates for every locale variant of the current page, plus
 * x-default pointing at the base-locale URL and og:locale for social
 * cards. Rendered inside <head> by the root document (SSR'd on the first
 * byte, which is what crawlers read). Paired with localized
 * self-canonicals (src/lib/self-url.ts) this makes /de/ and /fr/
 * indexable as first-class variants instead of consolidating into the
 * base locale.
 *
 * Skipped on surfaces with no SEO identity (embed iframes, the password
 * gate) and useless-but-harmless on authed pages (crawlers never see
 * them).
 *
 * ALSO skipped when the page canonicalizes off-origin (job details →
 * links.public, companies with a hosted publicUrl, blog posts with
 * canonicalUrl): hreflang members must be self-canonical and reciprocal,
 * so alternates pointing at THIS origin under a canonical pointing at
 * ANOTHER origin is the classic "hreflang conflicts with canonical"
 * Search Console error. Derived generically from the canonical the
 * matched route put in its loader data — no per-route flags to forget.
 */
import { useRouterState } from '@tanstack/react-router';

import { localizePath } from '../lib/localized-path';
import { publicLocales } from '../lib/public-locales';
import { getLocale, locales } from '../paraglide/runtime';

const EXCLUDED_PREFIXES = ['/embed', '/password'];

/** og:locale wants language_TERRITORY; hreflang wants bare tags. */
const OG_LOCALES = new Map([
  ['en', 'en_US'],
  ['de', 'de_DE'],
  ['fr', 'fr_FR'],
]);

interface HeadWithLinks {
  links?: Array<{ rel?: string; href?: string }>;
}

export function matchesDeclareExternalCanonical(
  matches: Array<{ loaderData?: unknown }>,
  origin: string,
): boolean {
  return matches.some((match) => {
    // SAFETY: Route loaderData contracts are heterogeneous; this head probe
    // only reads an optional canonical link shape before deciding hreflang output.
    const head = (match.loaderData as { head?: HeadWithLinks } | undefined)
      ?.head;
    return (
      head?.links?.some(
        (link) =>
          link.rel === 'canonical' &&
          link.href !== undefined &&
          !link.href.startsWith(origin),
      ) ?? false
    );
  });
}

export function AlternateLinks({ origin }: { origin: string }) {
  // The router exposes the DELOCALIZED href (rewrite.input) — exactly the
  // canonical path localizeHref expects.
  const href = useRouterState({ select: (state) => state.location.href });
  const externalCanonical = useRouterState({
    select: (state) => matchesDeclareExternalCanonical(state.matches, origin),
  });
  const path = href.split(/[?#]/, 1)[0] ?? '/';
  if (EXCLUDED_PREFIXES.some((prefix) => path.startsWith(prefix))) return null;
  if (externalCanonical) return null;
  const activeLocale = getLocale();
  // QA builds compile pseudo-locales into `locales`; never advertise them.
  // English-only (the default) has no alternate language versions to declare.
  const alternates = publicLocales(locales);
  return (
    <>
      {alternates.length >= 2
        ? alternates.map((locale) => (
            <link
              key={locale}
              rel="alternate"
              hrefLang={locale}
              href={`${origin}${localizePath(path, { locale })}`}
            />
          ))
        : null}
      {alternates.length >= 2 ? (
        <link rel="alternate" hrefLang="x-default" href={`${origin}${path}`} />
      ) : null}
      <meta
        property="og:locale"
        content={OG_LOCALES.get(activeLocale) ?? activeLocale}
      />
      {alternates
        .filter((locale) => locale !== activeLocale)
        .map((locale) => (
          <meta
            key={locale}
            property="og:locale:alternate"
            content={OG_LOCALES.get(locale) ?? locale}
          />
        ))}
    </>
  );
}
