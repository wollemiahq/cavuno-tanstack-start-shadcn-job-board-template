/**
 * Leave UI kit components that nothing imports out of the production CSS.
 *
 * Tailwind generates a class for every candidate it finds in the project's
 * files, and every page loads the one stylesheet it builds. `src/components/ui/`
 * holds the whole shadcn kit, and 18 of its 60 components were imported by
 * no page or component (sidebar, drawer, carousel, calendar, menubar...).
 * Their classes were 411 of the stylesheet's 1,787 utilities: 63 KB of
 * 249 KB raw, 8.5 of 36.9 KiB gzip (2026-10-15), all render-blocking.
 *
 * The list is worked out from the source at every build, so a component
 * comes back into the stylesheet as soon as any file imports it, including
 * one the builder writes. A file counts as imported when another non-test
 * source file names it in a module path (`#/components/ui/drawer`,
 * `@/components/ui/drawer`, or `./drawer` from inside the kit). That errs
 * towards keeping: a kit file imported only by another unused kit file
 * stays in. Classes of an excluded file that a used file also contains are
 * still generated, because Tailwind still scans the used file.
 *
 * Production builds only: the dev server keeps scanning everything, so a
 * component is styled the moment an edit imports it.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const SRC = join(root, 'src');
const KIT = join(SRC, 'components', 'ui');
const STYLES = join(SRC, 'styles.css');
const SOURCE_FILE = /\.(?:[cm]?[jt]sx?)$/;
const TEST_FILE = /\.test\.[cm]?[jt]sx?$/;
// Generated message modules: thousands of files, no imports of the kit.
const SKIP_DIRS = new Set(['paraglide']);

/** @param {string} dir @returns {string[]} */
function sourceFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return SKIP_DIRS.has(entry.name) ? [] : sourceFiles(path);
    }
    return SOURCE_FILE.test(entry.name) && !TEST_FILE.test(entry.name)
      ? [path]
      : [];
  });
}

/** @param {string} name */
function escapeRegExp(name) {
  return name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Kit component files (absolute paths) that no other source file imports.
 *
 * @param {{ kitDir?: string; srcDir?: string }} [dirs]
 * @returns {string[]}
 */
export function unusedKitFiles(dirs) {
  const kitDir = dirs?.kitDir ?? KIT;
  const files = sourceFiles(dirs?.srcDir ?? SRC).map((path) => ({
    path,
    text: readFileSync(path, 'utf8'),
  }));
  return files
    .filter((file) => dirname(file.path) === kitDir)
    .filter((kit) => {
      const name = basename(kit.path).replace(SOURCE_FILE, '');
      const specifier = new RegExp(
        `['"\`][^'"\`\\n]*(?:components/ui|\\.)/${escapeRegExp(name)}(?:\\.[cm]?[jt]sx?)?['"\`]`,
      );
      return !files.some(
        (file) => file.path !== kit.path && specifier.test(file.text),
      );
    })
    .map((kit) => kit.path);
}

/**
 * `@source not` lines for the given files, relative to `src/styles.css`.
 *
 * @param {string[]} files
 */
export function excludedSourceDirectives(files) {
  return files
    .map(
      (file) =>
        `@source not ${JSON.stringify(`./${relative(SRC, file).replaceAll('\\', '/')}`)};`,
    )
    .join('\n');
}

/** @returns {import('vite').Plugin} */
export function tailwindUnusedKitPlugin() {
  return {
    name: 'cavuno:tailwind-unused-kit',
    apply: 'build',
    // Before Tailwind's own `pre` transform, which compiles this file.
    enforce: 'pre',
    transform: {
      filter: { id: /[\\/]src[\\/]styles\.css(?:\?.*)?$/ },
      handler(code, id) {
        if (resolve(id.replace(/\?.*$/, '')) !== STYLES) return;
        const directives = excludedSourceDirectives(unusedKitFiles());
        if (directives === '') return;
        return { code: `${code}\n${directives}\n`, map: null };
      },
    },
  };
}
