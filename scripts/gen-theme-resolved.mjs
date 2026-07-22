import {
  buildSyncPayload,
  parseTokens,
  tokensHash,
} from './theme-resolved-lib.mjs';

/**
 * `npm run gen:theme` — derive src/theme/resolved.ts from the canonical
 * src/theme.css (ADR-0065 D2). OG routes import the resolved values
 * (Satori cannot read CSS variables); the module carries the source
 * hash so doctor can flag drift (D6). Never hand-edit the output.
 *
 * `--payload` prints the `boards/themeSnapshot:sync` args JSON instead —
 * pipe it to `npx convex run boards/themeSnapshot:sync` (from the
 * platform repo) after a theme change to keep server-rendered surfaces
 * (emails) in step with the repo theme (D3).
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';

const css = readFileSync('src/theme.css', 'utf8');
const parsed = parseTokens(css);
const hash = tokensHash(css);

if (process.argv.includes('--payload')) {
  const payload = buildSyncPayload(parsed, hash);
  payload.key = process.env.CAVUNO_BOARD ?? '<pk_…>';
  console.log(JSON.stringify(payload));
  process.exit(0);
}

mkdirSync('src/theme', { recursive: true });
writeFileSync(
  'src/theme/resolved.ts',
  `/**
 * GENERATED from src/theme.css — do not edit (npm run gen:theme).
 * Resolved theme values for renderers that cannot read CSS variables
 * (workers-og/Satori). The hash ties this module to its source; doctor
 * compares it against theme.css and the platform snapshot (ADR-0065).
 */
export const tokensHash = '${hash}'

export const themeMeta: {
  mode: string | null
  fontSans: string | null
  fontHeading: string | null
  fontsImport: string | null
  ogFontFamily: string | null
} = ${JSON.stringify(parsed.meta, null, 2)}

export const themeTokens: {
  light: Record<string, string>
  dark: Record<string, string>
} = {
  light: ${JSON.stringify(parsed.light, null, 2)},
  dark: ${JSON.stringify(parsed.dark, null, 2)},
}
`,
);
console.log(
  `src/theme/resolved.ts — ${Object.keys(parsed.light).length} light vars, hash ${hash.slice(0, 12)}…`,
);
