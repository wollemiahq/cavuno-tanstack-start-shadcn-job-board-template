/**
 * Board brand icons from `board.context()` (not `board.seo()`).
 *
 * Operators set the logo in Settings → General; Cavuno derives a favicon /
 * app-icon pack asynchronously. Absolute CDN URLs ride on
 * `GET /v1/boards/{identifier}` as `icons` next to `logoUrl`.
 *
 * Structural typing: `@cavuno/board` may lag a minor behind the live wire
 * until the next publish; runtime still receives `icons` once the API ships.
 */

/** Wire shape of `PublicBoardContext.icons` (Board API after PR #1351). */
export type BoardBrandIcons = {
  ico: string | null;
  svg: string | null;
  appleTouch: string | null;
  icon192: string | null;
  icon512: string | null;
  iconMaskable512: string | null;
};

/** Minimal context fields this helper needs. */
export type BoardBrandContext = {
  name?: string;
  logoUrl?: string | null;
  icons?: BoardBrandIcons | null;
};

export type HeadIconLink = {
  rel: string;
  href: string;
  type?: string;
  sizes?: string;
};

/** Starter `public/` assets — only when the board has no derived pack yet. */
const STARTER_FALLBACK_LINKS: HeadIconLink[] = [
  { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
  { rel: 'icon', href: '/favicon.ico' },
  {
    rel: 'icon',
    type: 'image/png',
    sizes: '192x192',
    href: '/logo192.png',
  },
  {
    rel: 'icon',
    type: 'image/png',
    sizes: '512x512',
    href: '/logo512.png',
  },
  { rel: 'apple-touch-icon', href: '/logo192.png' },
];

function pushIf(
  links: HeadIconLink[],
  href: string | null | undefined,
  link: Omit<HeadIconLink, 'href'>,
) {
  if (href) links.push({ ...link, href });
}

/**
 * Head `<link rel="icon" …>` entries for the document.
 * Emits only non-null board variants; falls back to starter static assets
 * when the board has no icon pack at all (empty / still generating).
 */
export function boardHeadIconLinks(
  board: BoardBrandContext | null | undefined,
): HeadIconLink[] {
  const icons = board?.icons;
  if (!icons) return STARTER_FALLBACK_LINKS;

  const links: HeadIconLink[] = [];
  pushIf(links, icons.ico, {
    rel: 'icon',
    type: 'image/x-icon',
    sizes: '32x32',
  });
  pushIf(links, icons.svg, {
    rel: 'icon',
    type: 'image/svg+xml',
  });
  pushIf(links, icons.icon192, {
    rel: 'icon',
    type: 'image/png',
    sizes: '192x192',
  });
  pushIf(links, icons.icon512, {
    rel: 'icon',
    type: 'image/png',
    sizes: '512x512',
  });
  pushIf(links, icons.appleTouch, {
    rel: 'apple-touch-icon',
    type: 'image/png',
    sizes: '180x180',
  });

  // No usable URLs yet — keep the starter pack so the tab is not broken.
  return links.length > 0 ? links : STARTER_FALLBACK_LINKS;
}

export type ManifestIcon = {
  src: string;
  sizes: string;
  type: string;
  purpose?: string;
};

/**
 * `site.webmanifest` icons array. Prefers board CDN URLs; falls back to
 * starter PNGs when none are available.
 */
export function boardManifestIcons(
  board: BoardBrandContext | null | undefined,
): ManifestIcon[] {
  const icons = board?.icons;
  const out: ManifestIcon[] = [];

  if (icons?.icon192) {
    out.push({
      src: icons.icon192,
      sizes: '192x192',
      type: 'image/png',
    });
  }
  if (icons?.icon512) {
    out.push({
      src: icons.icon512,
      sizes: '512x512',
      type: 'image/png',
    });
  }
  if (icons?.iconMaskable512) {
    out.push({
      src: icons.iconMaskable512,
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    });
  }

  if (out.length > 0) return out;

  return [
    { src: '/logo192.png', sizes: '192x192', type: 'image/png' },
    { src: '/logo512.png', sizes: '512x512', type: 'image/png' },
  ];
}

/** Read icons off a board context value even when SDK types lag the wire. */
type BoardIconsContext = {
  icons?: BoardBrandIcons | null;
};

export function boardIconsFromContext(
  board: BoardIconsContext | null | undefined,
): BoardBrandIcons | null | undefined {
  return board?.icons;
}
