/**
 * Site-header presentation for the builder's Menu color/appearance
 * control (`src/starter-config.ts` — machine-managed, closed enum).
 *
 * Mirrors shadcn Create's menu semantics on our top nav:
 * - `inverted*` adds the `dark` class to the header wrapper — the theme's
 *   `.dark { --… }` variable block re-scopes beneath it, so the nav
 *   renders in the theme's own dark palette even on a light page.
 * - `*-translucent` swaps the solid background for a frosted one
 *   (adapted from shadcn's translucent utility recipe).
 *
 * Kept OUT of starter-config.ts: the builder rewrites that file
 * wholesale, so it must stay a bare constant.
 */
import type { MENU_COLOR } from '#/starter-config';

type MenuColorValue = typeof MENU_COLOR;

export function isMenuInverted(value: MenuColorValue): boolean {
  return value === 'inverted' || value === 'inverted-translucent';
}

export function isMenuTranslucent(value: MenuColorValue): boolean {
  return value === 'default-translucent' || value === 'inverted-translucent';
}

/**
 * Class fragments for the `<header>` element. The caller composes them
 * with its structural classes via `cn`.
 */
export function menuColorClasses(value: MenuColorValue): string[] {
  const classes: string[] = [];
  if (isMenuInverted(value)) classes.push('dark');
  classes.push(
    isMenuTranslucent(value)
      ? 'bg-background/70 backdrop-blur-2xl backdrop-saturate-150'
      : 'bg-background',
  );
  return classes;
}
