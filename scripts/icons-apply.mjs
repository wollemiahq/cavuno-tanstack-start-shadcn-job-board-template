import { iconLibraries } from 'shadcn/icons';

/**
 * `pnpm run icons:apply --to <library>` — re-skin the board's ICONOGRAPHY in
 * one command, the way `theme:apply` re-skins its colours and fonts.
 *
 * This is the icon half of the customization story (docs/theming.md §Icons).
 * Like the theme wrapper, it exists because the raw shadcn CLI leaves this
 * repo in a state the gates reject — not because the CLI is wrong.
 *
 * WHAT THE CLI DOES WELL (shadcn >= 4.14.0). We delegate all of it:
 *
 *   • `--from` / `--to` across six libraries (lucide, tabler, phosphor,
 *     remixicon, hugeicons, radix), non-interactive with `-y`.
 *   • A `[path]` argument that accepts a glob, so the migration can be
 *     scoped past `components.json` → `aliases.ui`.
 *   • A real ts-morph rewrite that handles self-closing JSX, paired JSX,
 *     icons passed as JSX attribute values (`icon={BoldIcon}`), and the
 *     wrapper shape hugeicons needs (`<HugeiconsIcon icon={…} />`).
 *   • Icon-name aliasing, so lucide's `CheckIcon` and `Check` both resolve.
 *   • Skipped icons reported with a reason instead of silently corrupted.
 *
 * We do NOT reimplement any of that. An earlier revision of this script
 * carried its own transform because shadcn 4.13.0 needed one; 4.14.0 does the
 * job properly and that code is gone.
 *
 * WHAT THE CLI STILL WILL NOT DO — the entire reason this wrapper exists:
 *
 *   1. It exits 0 on a PARTIAL migration. Every icon it cannot map is
 *      printed as a warning and left importing the old library. "Migration
 *      complete." does not mean "nothing imports the old library". A
 *      half-migrated app typechecks and builds clean — verified — so this
 *      wrapper runs a PRE-FLIGHT and refuses to start unless every icon in
 *      use has an equivalent.
 *   2. It does not know about brand marks. `src/components/brand-icons.tsx`
 *      must never be rewritten (see ALLOWLIST).
 *   3. **It skips the `components.json` update whenever a path is given** —
 *      that write is guarded by `if (!path)`, and a whole-repo migration is
 *      exactly the path case. The wrapper writes `iconLibrary` itself.
 *   4. It leaves the repo's derived artifacts stale (`gen:shadcn` and
 *      `gen:design` both read component source).
 *   5. It never verifies the end state. The wrapper does, and fails loudly
 *      naming every file still on the old library.
 *   6. It installs the target package itself. Dependencies are an operator
 *      decision here (AGENTS.md §Dependencies: the platform gate refuses
 *      agent-added packages, and `minimumReleaseAge` holds new versions for
 *      a day), so the wrapper stops before the install and prints the
 *      commands to run.
 *
 *   pnpm run icons:apply --to tabler
 *   pnpm run icons:apply --to phosphor --from lucide
 *   pnpm run icons:apply --to tabler --dry-run     # coverage report only
 *
 * The structural guarantee is enforced independently of this script by
 * `src/icon-set-contract.test.ts`, which fails whenever more than one icon
 * library appears in `src/**`. Running the CLI by hand is fine; the gate is
 * what makes a partial result impossible to commit.
 *
 * No new dependency: `shadcn` is already a dependency and the icon map is
 * plain JSON over https. Dev-time only, never part of the build.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, relative } from 'node:path';

const root = join(import.meta.dirname, '..');
const argv = process.argv.slice(2);

/** First version with `--from`/`--to`, a honoured `[path]`, and skip reports. */
const MINIMUM_CLI = '4.14.0';

/**
 * The libraries the CLI can migrate between: its own catalog, plus `radix`,
 * which the CLI keeps in its migration map only (a legacy source).
 */
const LIBRARIES = new Map([
  ...Object.entries(iconLibraries).map(([name, meta]) => [
    name,
    meta.packages ?? [],
  ]),
  ['radix', ['@radix-ui/react-icons']],
]);

/**
 * Never rewritten. `brand-icons.tsx` holds third-party BRAND MARKS (Google,
 * X, LinkedIn, Facebook) — hand-inlined precisely because no icon library
 * ships them, with Google's mark carrying literal brand fills that must not
 * be recoloured. Swapping the icon library does not change what Google's logo
 * looks like, so these are out of scope by definition, not a grudging
 * exception. `src/theme-portability.test.ts` allowlists the same file.
 */
const ALLOWLIST = ['src/components/brand-icons.tsx'];

/** The glob handed to the CLI — the whole app surface, not just `ui/`. */
const SURFACE_GLOB = 'src/**/*.{ts,tsx}';

const ICON_MAP_URL = 'https://ui.shadcn.com/r/icons/index.json';

const USAGE = [
  'Usage: pnpm run icons:apply --to <library> [--from <library>] [--dry-run]',
  '',
  `Libraries: ${[...LIBRARIES.keys()].join(', ')}`,
  '',
  '  --to <library>    the icon library to migrate TO. Required.',
  '  --from <library>  the library to migrate FROM.',
  '                    Defaults to components.json → iconLibrary.',
  '  --dry-run         report coverage; run nothing, write nothing.',
  '',
  `Migrates ${SURFACE_GLOB} — the whole app surface, not just`,
  `src/components/ui/ — and never touches ${ALLOWLIST.join(', ')}.`,
].join('\n');

/** Bail with the usage message. */
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

const dryRun = argv.includes('--dry-run');

// ── Guard the CLI version ─────────────────────────────────────────────────
// 4.13.0 accepts --from/--to and the path argument and then IGNORES them,
// migrating src/components/ui/ only — the precise half-migration this wrapper
// exists to prevent. Refuse rather than produce it.
// `shadcn/package.json` is not in the package's `exports` map, so resolve the
// entry point and walk up to the manifest beside it.
const shadcnEntry = createRequire(import.meta.url).resolve('shadcn');
const shadcnRoot = shadcnEntry.slice(0, shadcnEntry.lastIndexOf('/dist/'));
const cliVersion = JSON.parse(
  readFileSync(join(shadcnRoot, 'package.json'), 'utf8'),
).version;

/** True when `a` sorts before `b` by numeric semver precedence. */
function older(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) < (pb[i] ?? 0);
  }
  return false;
}

if (older(cliVersion, MINIMUM_CLI)) {
  fail(
    `shadcn ${cliVersion} is installed; this wrapper needs >= ${MINIMUM_CLI}.\n` +
      '  Older CLIs accept --from/--to and the path glob and then IGNORE both,\n' +
      '  migrating only src/components/ui/ — a silent half-migration.\n' +
      '  The package.json range already allows it; upgrading is an operator\n' +
      '  decision because pnpm-workspace.yaml holds new releases for a day\n' +
      '  (minimumReleaseAge). Once the cooldown has elapsed: pnpm update shadcn',
  );
}

// ── Resolve the two libraries ─────────────────────────────────────────────
const componentsPath = join(root, 'components.json');
const components = JSON.parse(readFileSync(componentsPath, 'utf8'));

const to = takeFlag('--to');
const from = takeFlag('--from') ?? components.iconLibrary;

if (!to) fail('No target library given (--to).');
if (!from) {
  fail(
    'No source library: --from was omitted and components.json declares no ' +
      '`iconLibrary`.',
  );
}
for (const [label, value] of [
  ['--from', from],
  ['--to', to],
]) {
  if (!LIBRARIES.has(value)) {
    fail(
      `"${value}" is not a shadcn icon library (${label}). ` +
        `Supported: ${[...LIBRARIES.keys()].join(', ')}.`,
    );
  }
}
if (from === to) {
  fail(`--from and --to are both "${from}" — nothing to migrate.`);
}

const sourcePackages = LIBRARIES.get(from);
const targetPackages = LIBRARIES.get(to);

/** Run a command inheriting stdio; exit the whole script on failure. */
function run(command, args) {
  console.log(`\n$ ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, { stdio: 'inherit', shell: false });
  if (result.status !== 0) {
    console.error(`\n✖ \`${command} ${args.join(' ')}\` failed — aborting.`);
    process.exit(result.status ?? 1);
  }
}

// ── 1. Pre-flight: would this be a COMPLETE migration? ────────────────────
// The CLI answers this only after it has already rewritten the tree, and
// answers it with warnings and exit 0. We answer it first, and refuse.

/** Every .ts/.tsx file under src/, allowlist removed. */
function surfaceFiles() {
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      if (entry === 'node_modules') continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.tsx?$/.test(entry)) out.push(full);
    }
  };
  walk(join(root, 'src'));
  const skip = new Set(ALLOWLIST);
  return out.filter((file) => !skip.has(relative(root, file)));
}

/**
 * The CLI's own name table. Mirrors its `mf()` aliasing: registry entries key
 * on lucide's unsuffixed export (`Check`), while shadcn source imports the
 * suffixed alias (`CheckIcon`), and both must resolve.
 */
async function loadIconMap() {
  const response = await fetch(ICON_MAP_URL);
  if (!response.ok) {
    fail(
      `Could not fetch the shadcn icon map (${ICON_MAP_URL}): ` +
        `HTTP ${response.status}. This wrapper needs network access.`,
    );
  }
  const table = await response.json();
  const byName = new Map();
  for (const entry of Object.values(table)) {
    if (entry?.[from] && entry?.[to]) byName.set(entry[from], entry[to]);
  }
  if (from === 'lucide') {
    for (const [name, mapped] of [...byName]) {
      const alias = name.endsWith('Icon') ? name.slice(0, -4) : `${name}Icon`;
      if (alias && !byName.has(alias)) byName.set(alias, mapped);
    }
  }
  if (byName.size === 0) {
    fail(`The shadcn icon map has no ${from} → ${to} pairs.`);
  }
  return byName;
}

const iconMap = await loadIconMap();
const importPattern = new RegExp(
  `import\\s+(type\\s+)?\\{([^}]*)\\}\\s*from\\s*['"](?:${sourcePackages
    .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|')})['"]`,
  'g',
);

const unmapped = new Map(); // identifier → files
const files = new Set();
const identifiers = new Set();

for (const file of surfaceFiles()) {
  const code = readFileSync(file, 'utf8');
  for (const match of code.matchAll(importPattern)) {
    files.add(relative(root, file));
    const blanketType = Boolean(match[1]);
    for (const part of match[2].split(',')) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const isType = blanketType || /^type\s/.test(trimmed);
      const name = trimmed
        .replace(/^type\s+/, '')
        .split(/\s+as\s+/)[0]
        .trim();
      identifiers.add(name);
      // A library-specific TYPE (lucide's `LucideIcon`) is never in the icon
      // map, and the CLI skips it SILENTLY — it is not even in the skip
      // report. Surface it here or it becomes an invisible straggler.
      if (isType || !iconMap.has(name)) {
        unmapped.set(name, [
          ...(unmapped.get(name) ?? []),
          relative(root, file),
        ]);
      }
    }
  }
}

console.log(`\nIcon migration: ${from} → ${to}   (shadcn ${cliVersion})`);
console.log(`  surface        ${SURFACE_GLOB}`);
console.log(`  allowlist      ${ALLOWLIST.join(', ')}`);
console.log(`  files          ${files.size}`);
console.log(
  `  identifiers    ${identifiers.size} distinct, ` +
    `${identifiers.size - unmapped.size} with a ${to} equivalent`,
);

if (files.size === 0) {
  console.log(
    `\n✔ Nothing imports ${sourcePackages.join('/')}. Already migrated?`,
  );
  process.exit(0);
}

if (unmapped.size > 0) {
  console.error(
    `\n✖ ${unmapped.size} of ${identifiers.size} identifiers have no ${to} ` +
      'equivalent.\n' +
      '  The CLI would migrate the rest, warn about these, and exit 0 — ' +
      'leaving the app\n  importing BOTH ' +
      `${sourcePackages.join('/')} and ${targetPackages.join('/')}. That is ` +
      'the parallel icon\n  set AGENTS.md forbids and ' +
      'src/icon-set-contract.test.ts fails on, so nothing\n  has been run.\n',
  );
  for (const [name, where] of [...unmapped].sort()) {
    const unique = [...new Set(where)];
    const shown = unique.slice(0, 3).join(', ');
    const more = unique.length > 3 ? `, +${unique.length - 3} more` : '';
    console.error(`    ${name.padEnd(24)} ${shown}${more}`);
  }
  console.error(
    `\n  ${ICON_MAP_URL} is a curated subset (191 icons), not a\n` +
      '  complete index of either library. To proceed, an operator must:\n' +
      '    • replace the unmapped icons at their call sites with icons the\n' +
      '      map covers, then re-run; or\n' +
      '    • compare targets with --dry-run and pick one with full coverage; or\n' +
      '    • migrate the remainder by hand, then re-run to verify.\n' +
      "  Library-specific TYPES (lucide's `LucideIcon`) are never in the map\n" +
      "  and always need a hand edit to the target's own icon type.",
  );
  process.exit(1);
}

if (dryRun) {
  console.log(
    `\n✔ Dry run: every identifier maps. ${files.size} files would be ` +
      'migrated. Re-run without --dry-run to apply.',
  );
  process.exit(0);
}

// ── 2. Delegate the rewrite to the CLI ────────────────────────────────────
run('pnpm', [
  'exec',
  'shadcn',
  'migrate',
  'icons',
  SURFACE_GLOB,
  '--from',
  from,
  '--to',
  to,
  '-y',
]);

// ── 3. The components.json write the CLI skips in path mode ───────────────
if (components.iconLibrary !== to) {
  components.iconLibrary = to;
  writeFileSync(componentsPath, `${JSON.stringify(components, null, 2)}\n`);
  console.log(`\n✔ components.json → iconLibrary: "${to}".`);
}

// ── 4. Re-derive artifacts that read component source ─────────────────────
// gen:shadcn rebuilds docs/shadcn-component-usage.json + shadcn-components.md
// and validates components.json; gen:design rebuilds DESIGN.md's inventory.
// Both go stale the moment an import line changes, and both are drift-gated.
run('pnpm', ['run', 'gen:shadcn']);
run('pnpm', ['run', 'gen:design']);

// ── 5. Verify the end state the CLI never checks ──────────────────────────
const survivors = surfaceFiles().filter((file) => {
  const code = readFileSync(file, 'utf8');
  return sourcePackages.some((pkg) => code.includes(`'${pkg}'`));
});
if (survivors.length > 0) {
  console.error(
    `\n✖ ${survivors.length} file(s) still import ` +
      `${sourcePackages.join('/')}. The app is on TWO icon sets:`,
  );
  for (const file of survivors) console.error(`    ${relative(root, file)}`);
  console.error(
    '\n  Fix these before committing — src/icon-set-contract.test.ts fails ' +
      'until they are gone.',
  );
  process.exit(1);
}
console.log(
  `✔ No file outside the allowlist imports ${sourcePackages.join('/')}.`,
);

// ── 6. The dependency change is the operator's, not ours ──────────────────
console.log(
  '\n  Dependencies are NOT changed by this script (AGENTS.md §Dependencies).\n' +
    '  Run these yourself:\n' +
    `      pnpm remove ${sourcePackages.join(' ')}\n` +
    `      pnpm add ${targetPackages.join(' ')}\n` +
    '\n  Then: pnpm run typecheck && pnpm test && pnpm run build',
);
