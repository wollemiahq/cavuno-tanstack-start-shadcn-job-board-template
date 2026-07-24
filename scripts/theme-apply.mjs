/**
 * `pnpm run theme:apply <preset-id | create-url | registry-url>` — swap the
 * starter's theme in one command, whichever of the shadcn CLI's two theme
 * paths the source uses.
 *
 * This is the dev-time half of the theming story (docs/theming.md). The CLI
 * has TWO ways to install a theme, and this wrapper routes to the right one
 * from the shape of the argument:
 *
 *   • a bare preset id (`b2D0vQ7G4`) or a `ui.shadcn.com/create?preset=…`
 *     share URL  →  `shadcn apply --preset <id> --only theme -y`
 *     First-party presets from https://ui.shadcn.com/create.
 *
 *   • any other http(s) URL (`https://tweakcn.com/r/themes/bubblegum.json`,
 *     a self-hosted registry item, …)  →  `shadcn add <url> -y`
 *     ANY shadcn-format theme registry. This is the path that reaches a
 *     dramatic re-skin: all eight first-party presets are near-monochrome
 *     (max chroma 0.021), so a real brand color comes from a registry theme.
 *
 * Either way the wrapper then re-runs the two generators that keep the derived
 * artifacts in step with the canonical `src/theme.css` — the real reason this
 * wrapper exists, since a raw CLI run leaves them stale and fails the drift
 * gate:
 *
 *   1. `shadcn apply …` / `shadcn add …`  →  rewrites src/theme.css
 *   2. `pnpm run gen:theme`               →  src/theme/resolved.ts
 *   3. `pnpm run gen:design`              →  DESIGN.md + tokens.dtcg.json
 *
 * It finally runs a FONT SANITY check: a third-party theme can write
 * `--font-sans: Poppins, sans-serif` without an `@fontsource` import, which
 * silently renders a system fallback. The wrapper warns, naming the font and
 * the exact fix; it never edits `src/theme.css` for you. (The same condition
 * is enforced by `src/theme-foundation.test.ts`.)
 *
 * `src/theme.css` stays the single source of truth (AGENTS.md: no parallel
 * token system) — the CLI owns it, the generators only derive from it. We do
 * NOT hand-write token values anywhere.
 *
 * FLAGS APPLY PER PATH. `--only` and `--full` are `shadcn apply` concepts —
 * they scope a PRESET apply. `shadcn add` installs a registry item whole and
 * takes neither, so passing them with a registry URL is an error rather than
 * a silent no-op.
 *
 *   pnpm run theme:apply b2D0vQ7G4
 *   pnpm run theme:apply "https://ui.shadcn.com/create?preset=b2D0vQ7G4"
 *   pnpm run theme:apply b2D0vQ7G4 --only theme,font
 *   pnpm run theme:apply b2D0vQ7G4 --full
 *   pnpm run theme:apply https://tweakcn.com/r/themes/bubblegum.json
 *
 * No new dependency: the `shadcn` CLI is already a devDependency, run via
 * `pnpm exec`. Both paths fetch over the network — this is a dev-time tool,
 * never part of the build.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const argv = process.argv.slice(2);

const USAGE = [
  'Usage: pnpm run theme:apply <preset-id | create-url | registry-url> [flags]',
  '',
  'Two input forms, routed automatically:',
  '',
  '  1. shadcn preset  — a bare id, or a ui.shadcn.com/create share URL.',
  '       pnpm run theme:apply b2D0vQ7G4',
  '       pnpm run theme:apply "https://ui.shadcn.com/create?preset=b2D0vQ7G4"',
  '     Runs: shadcn apply --preset <id> --only theme -y',
  '     Flags: --only theme,font | --full   (apply-only flags)',
  '',
  '  2. theme registry — any other http(s) URL to a shadcn-format theme JSON.',
  '       pnpm run theme:apply https://tweakcn.com/r/themes/bubblegum.json',
  '     Runs: shadcn add <url> -y',
  '     Flags: none — `add` installs the registry item whole.',
  '',
  'Both forms then re-run gen:theme + gen:design and font-check the result.',
].join('\n');

/** Bail with the two-form usage message. */
function fail(message) {
  console.error(`✖ ${message}\n\n${USAGE}`);
  process.exit(1);
}

if (argv.includes('--help') || argv.includes('-h')) {
  console.log(USAGE);
  process.exit(0);
}

/** Pull `<value>` out of `--flag value` or `--flag=value`; null if absent. */
function takeFlag(name) {
  const eq = argv.find((a) => a.startsWith(`${name}=`));
  if (eq) return eq.slice(name.length + 1);
  const i = argv.indexOf(name);
  if (i !== -1 && argv[i + 1] && !argv[i + 1].startsWith('-')) {
    return argv[i + 1];
  }
  return null;
}

const full = argv.includes('--full');
const onlyFlag = takeFlag('--only');

// The theme ref: the value of --preset, else the first bare (non-flag) arg.
const flagPreset = takeFlag('--preset');
const bareRef = argv.find((a, i) => {
  if (a.startsWith('-')) return false;
  // Skip a token that is the value of a preceding value-taking flag.
  const prev = argv[i - 1];
  return prev !== '--preset' && prev !== '--only';
});
const ref = flagPreset ?? bareRef ?? null;

if (!ref) fail('No theme given.');

// ── Routing ───────────────────────────────────────────────────────────────
// A ui.shadcn.com create link is a PRESET wearing a URL; every other http(s)
// URL is a registry item. Anything else must look like a bare preset id.
let url = null;
if (/^https?:\/\//i.test(ref)) {
  try {
    url = new URL(ref);
  } catch {
    fail(`"${ref}" looks like a URL but could not be parsed.`);
  }
} else if (ref.includes('/') || ref.includes('.')) {
  fail(
    `"${ref}" is neither a bare preset id nor an http(s) URL. ` +
      'Preset ids are short alphanumeric tokens (e.g. b2D0vQ7G4); registry ' +
      'themes must be a full https:// URL to the theme JSON.',
  );
}

const isCreateLink = url?.hostname.replace(/^www\./, '') === 'ui.shadcn.com';
let mode; // 'apply' | 'add'
let preset = null;
let registryUrl = null;

if (url && !isCreateLink) {
  mode = 'add';
  registryUrl = url.toString();
} else if (url) {
  preset = url.searchParams.get('preset');
  if (!preset) {
    fail(
      `"${ref}" is a ui.shadcn.com link with no ?preset= id. Copy the share ` +
        'URL from https://ui.shadcn.com/create, or pass the bare id.',
    );
  }
  mode = 'apply';
} else {
  if (!/^[\w-]+$/.test(ref)) {
    fail(`"${ref}" is not a usable preset id (expected e.g. b2D0vQ7G4).`);
  }
  preset = ref;
  mode = 'apply';
}

// Apply-only flags with a registry URL is a mistake, not a no-op — say so.
if (mode === 'add') {
  const offenders = [
    onlyFlag !== null || argv.some((a) => a.startsWith('--only'))
      ? '--only'
      : null,
    full ? '--full' : null,
  ].filter(Boolean);
  if (offenders.length > 0) {
    fail(
      `${offenders.join(' and ')} ${offenders.length > 1 ? 'are' : 'is'} a ` +
        '`shadcn apply` flag and only scopes a PRESET apply. A registry theme ' +
        'is installed whole by `shadcn add` — drop the flag, or use a preset id.',
    );
  }
}

const only = onlyFlag ?? 'theme';

/** Run a command inheriting stdio; exit the whole script on failure. */
function run(command, args) {
  console.log(`\n$ ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, { stdio: 'inherit', shell: false });
  if (result.status !== 0) {
    console.error(`\n✖ \`${command} ${args.join(' ')}\` failed — aborting.`);
    process.exit(result.status ?? 1);
  }
}

// ── 1. Rewrite src/theme.css (the CLI owns the canonical theme) ───────────
if (mode === 'apply') {
  const applyArgs = ['shadcn', 'apply', '--preset', preset, '-y'];
  if (!full) applyArgs.push('--only', only);
  run('pnpm', ['exec', ...applyArgs]);
} else {
  run('pnpm', ['exec', 'shadcn', 'add', registryUrl, '-y']);
}

// ── 2 + 3. Re-derive the generated artifacts from the new theme.css ───────
run('pnpm', ['run', 'gen:theme']);
run('pnpm', ['run', 'gen:design']);

// ── 4. Font sanity ────────────────────────────────────────────────────────

/** First family of a font stack (quoted or bare) as a fontsource slug. */
function familySlug(value) {
  const first = value?.split(',')[0]?.trim();
  if (!first || first.startsWith('var(')) return null;
  const family = first.match(/^['"]([^'"]+)['"]$/)?.[1] ?? first;
  return (
    family
      .replace(/\s+Variable$/i, '')
      .toLowerCase()
      .replace(/\s+/g, '-') || null
  );
}

/**
 * Warn when a token names a family that no `@fontsource` import backs. The
 * theme still "works" — it renders in a system fallback, silently — so the
 * warning has to name the family AND the exact fix, which differs by whether
 * the family is in the pre-installed catalog (docs/theming.md §Fonts).
 */
function checkFonts() {
  const theme = readFileSync(join(root, 'src/theme.css'), 'utf8');
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const declared = Object.keys({
    ...pkg.dependencies,
    ...pkg.devDependencies,
  }).filter((name) => /^@fontsource(-variable)?\//.test(name));

  // The pre-installed catalog, keyed by family slug → package specifier.
  // One family ships under a differently-numbered package (source-sans-pro
  // → source-sans-3), so map by the package's own slug and alias that case.
  const catalog = new Map(declared.map((name) => [name.split('/')[1], name]));
  const ALIASES = { 'source-sans-pro': '@fontsource-variable/source-sans-3' };

  const imported = new Set(
    [
      ...theme.matchAll(
        /@import\s+['"]@fontsource(?:-variable)?\/([a-z0-9-]+)(?:\/[^'"]*)?['"]/g,
      ),
    ].map(([, slug]) => slug),
  );

  const tokens = [
    ['--font-sans', theme.match(/--font-sans:\s*([^;]+);/)?.[1]],
    ['--font-heading', theme.match(/--font-heading:\s*([^;]+);/)?.[1]],
  ];

  const problems = [];
  for (const [token, value] of tokens) {
    if (!value || /var\(--font-sans\)/.test(value)) continue;
    const slug = familySlug(value);
    if (!slug || imported.has(slug)) continue;
    problems.push({ token, value: value.trim(), slug });
  }

  if (problems.length === 0) {
    console.log(
      '\n✔ Font check: every declared family has a matching @fontsource import.',
    );
    return;
  }

  for (const { token, value, slug } of problems) {
    const pretty = slug.replace(
      /(^|-)([a-z])/g,
      (_, s, c) => (s ? ' ' : '') + c.toUpperCase(),
    );
    const specifier = ALIASES[slug] ?? catalog.get(slug);
    console.warn(
      `\n⚠ Font check: the theme declares ${token}: ${value} but src/theme.css ` +
        `has no @fontsource import for "${slug}".`,
    );
    console.warn(
      '  Left as-is the board renders a silent system fallback, and gen:theme ' +
        'reports the wrong font.',
    );
    if (specifier) {
      const isStatic = specifier.startsWith('@fontsource/');
      console.warn(
        `  ${pretty} IS in the pre-installed catalog — no dependency change needed. ` +
          `Add to src/theme.css:`,
      );
      console.warn(
        isStatic
          ? `      @import '${specifier}/400.css';   (repeat for 500/600/700)`
          : `      @import '${specifier}';`,
      );
      console.warn(
        `  …and drop the now-unused import of the previous family. Then re-run: ` +
          'pnpm run gen:theme && pnpm run gen:design',
      );
    } else {
      console.warn(
        `  ${pretty} is NOT in the pre-installed catalog (docs/theming.md §Fonts). ` +
          'Either install it yourself (an operator decision — the platform ' +
          'dependency gate refuses agent-added packages), or point the token at ' +
          'a catalog family.',
      );
    }
  }
  console.warn(
    '\n  Until then `pnpm test` fails in src/theme-foundation.test.ts.',
  );
}

const label =
  mode === 'apply' ? `preset "${preset}"` : `registry theme ${registryUrl}`;
console.log(
  `\n✔ Applied ${label}. src/theme.css → resolved.ts → DESIGN.md are in step.`,
);
checkFonts();
console.log(
  '\n  Review the diff, then run: pnpm run typecheck && pnpm test && pnpm run build',
);
