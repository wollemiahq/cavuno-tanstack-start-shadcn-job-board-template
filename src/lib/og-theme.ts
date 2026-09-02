import { toSatoriColor } from './css-color';

import { themeTokens } from '@/theme/resolved';

let cached: Record<string, string> | null = null;

/**
 * The light theme tokens in a syntax Satori accepts. `themeTokens` is
 * generated from src/theme.css and carries `oklch(...)` values, which the OG
 * card renderer cannot parse — every color that reaches OG markup must come
 * through here. Light values by rule (share cards do not follow the viewer's
 * scheme). Memoised per isolate: the tokens are build-time constants.
 */
export function ogThemeTokens(): Record<string, string> {
  if (cached) return cached;
  cached = Object.fromEntries(
    Object.entries(themeTokens.light).map(([name, value]) => [
      name,
      toSatoriColor(value),
    ]),
  );
  return cached;
}
