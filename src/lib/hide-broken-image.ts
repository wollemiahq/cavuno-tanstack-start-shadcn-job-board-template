import type { SyntheticEvent } from 'react';

/**
 * `onError` handler for decorative/supplementary `<img>` elements (blog
 * covers, board logos): a URL that fails to load hides the element instead
 * of leaving the browser's broken-image icon in the layout. Avatars don't
 * need this — the Avatar primitive already falls back to initials.
 */
export function hideBrokenImage(event: SyntheticEvent<HTMLImageElement>) {
  event.currentTarget.hidden = true;
}
