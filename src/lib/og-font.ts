import { loadGoogleFont } from 'workers-og';

import { themeMeta } from '../theme/resolved';

/**
 * FNT-02: OG cards render the board's theme font the way they already
 * render its colors. `ogFontFamily` is derived by gen:theme (heading
 * family when set, else body family, ' Variable' suffix stripped) —
 * every catalog font is Google-loadable, so `loadGoogleFont` can fetch
 * a subset binary for Satori at render time (server-side; same posture
 * as the previous hardcoded Inter).
 */
export const OG_FONT_FAMILY = themeMeta.ogFontFamily ?? 'Inter';

export interface OgFont {
  name: string;
  data: ArrayBuffer;
}

/**
 * Load the theme font subset for `text`; fall back to Inter so an OG
 * card degrades to the wrong font rather than a 500 when the family
 * isn't Google-servable (e.g. an off-catalog self-hosted font). A
 * fully egress-blocked runtime (working-preview sandbox) still fails
 * both fetches — unchanged from the hardcoded-Inter behavior.
 */
export async function loadOgFont(text: string): Promise<OgFont> {
  try {
    return {
      name: OG_FONT_FAMILY,
      data: await loadGoogleFont({ family: OG_FONT_FAMILY, weight: 600, text }),
    };
  } catch {
    return {
      name: 'Inter',
      data: await loadGoogleFont({ family: 'Inter', weight: 600, text }),
    };
  }
}
