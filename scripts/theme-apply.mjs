/**
 * `pnpm run theme:apply <preset>` — swap the starter's theme to a shadcn
 * preset in one command.
 *
 * This is the dev-time half of the theming story (docs/theming.md): pick a
 * preset on https://ui.shadcn.com/create, copy its id (or the whole share
 * URL), and run this. It wraps the shadcn CLI's `apply` and then re-runs the
 * two generators that keep the derived artifacts in step with the canonical
 * `src/theme.css`:
 *
 *   1. `shadcn apply --preset <id> --only theme -y`  →  rewrites src/theme.css
 *   2. `pnpm run gen:theme`                          →  src/theme/resolved.ts
 *   3. `pnpm run gen:design`                         →  DESIGN.md + tokens.dtcg.json
 *
 * `src/theme.css` stays the single source of truth (AGENTS.md: no parallel
 * token system) — the CLI owns it, the generators only derive from it. We do
 * NOT hand-write token values anywhere.
 *
 * Default is `--only theme`: it touches ONLY the theme block, never reinstalls
 * components or swaps fonts, so a theme swap is a one-file change that leaves
 * every component untouched. Override the scope with `--only theme,font` or
 * `--full` (a complete preset apply) if you deliberately want more.
 *
 *   pnpm run theme:apply b2D0vQ7G4
 *   pnpm run theme:apply https://ui.shadcn.com/create?preset=b2D0vQ7G4
 *   pnpm run theme:apply b2D0vQ7G4 --only theme,font
 *   pnpm run theme:apply b2D0vQ7G4 --full
 *
 * No new dependency: the `shadcn` CLI is already a devDependency, run via
 * `pnpm exec`. Applying a preset fetches it from the shadcn registry, so this
 * needs network — it is a dev-time tool, never part of the build.
 */
import { spawnSync } from 'node:child_process';

const argv = process.argv.slice(2);

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
const only = takeFlag('--only') ?? 'theme';

// The preset ref: the value of --preset, else the first bare (non-flag) arg.
// Accept a whole create share URL and extract its ?preset= id, so you can
// paste straight from the browser.
const flagPreset = takeFlag('--preset');
const barePreset = argv.find((a, i) => {
  if (a.startsWith('-')) return false;
  // Skip a token that is the value of a preceding value-taking flag.
  const prev = argv[i - 1];
  return prev !== '--preset' && prev !== '--only';
});
let preset = flagPreset ?? barePreset ?? null;

if (preset && preset.includes('ui.shadcn.com')) {
  try {
    preset = new URL(preset).searchParams.get('preset') ?? preset;
  } catch {
    // Leave as-is; the CLI will report an unusable ref.
  }
}

if (!preset) {
  console.error(
    [
      'Usage: pnpm run theme:apply <preset-id | create-url> [--only theme,font] [--full]',
      '',
      'Pick a preset on https://ui.shadcn.com/create, then pass its id or share URL:',
      '  pnpm run theme:apply b2D0vQ7G4',
      '  pnpm run theme:apply "https://ui.shadcn.com/create?preset=b2D0vQ7G4"',
    ].join('\n'),
  );
  process.exit(1);
}

/** Run a command inheriting stdio; exit the whole script on failure. */
function run(command, args) {
  console.log(`\n$ ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, { stdio: 'inherit', shell: false });
  if (result.status !== 0) {
    console.error(`\n✖ \`${command} ${args.join(' ')}\` failed — aborting.`);
    process.exit(result.status ?? 1);
  }
}

const applyArgs = ['shadcn', 'apply', '--preset', preset, '-y'];
if (!full) applyArgs.push('--only', only);

// 1. Rewrite src/theme.css from the preset (CLI owns the canonical theme).
run('pnpm', ['exec', ...applyArgs]);
// 2 + 3. Re-derive the generated artifacts from the new theme.css.
run('pnpm', ['run', 'gen:theme']);
run('pnpm', ['run', 'gen:design']);

console.log(
  `\n✔ Applied preset "${preset}". src/theme.css → resolved.ts → DESIGN.md are in step.`,
);
console.log(
  '  Review the diff, then run: pnpm run typecheck && pnpm test && pnpm run build',
);
