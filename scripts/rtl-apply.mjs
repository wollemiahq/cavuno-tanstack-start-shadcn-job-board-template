// `typescript` (7.x) is the native port and exposes no JS compiler API; the
// repo already declares `typescript-6` (npm:@typescript/typescript6) for
// exactly this — tooling that needs to parse. No new dependency.
import ts from 'typescript-6';

/**
 * `pnpm run rtl:apply` — rewrite the board's PHYSICAL Tailwind utilities to
 * their LOGICAL equivalents, so the app mirrors under `dir="rtl"`.
 *
 * This is the layout half of the bidi story (ADR-0063). `<html dir>` is
 * already wired from the UI locale (src/lib/locale-direction.ts) and this
 * codebase is flexbox/`gap`/`justify`-based, so direction alone mirrors most
 * of the page. What it does NOT mirror is anything pinned to a physical
 * edge — `pl-*`, `mr-*`, `text-right`, `border-l`, `rounded-r-*`. Those are
 * what this script converts.
 *
 * WHY NOT `shadcn migrate rtl`. It was tried and it is destructive here:
 *
 *   • The glob form (`shadcn migrate rtl 'src/**‍/*.tsx'`) replaced
 *     `src/routes/settings.tsx` with a 9-line stub — 201 files, 4961
 *     deletions in one run.
 *   • Even the bare default form silently deleted the
 *     `// @vitest-environment jsdom` pragma from 10 test files. It rewrites
 *     through a formatter that drops leading comments.
 *   • Its rewrite is semantically wrong on PHYSICAL APIs. In `sheet.tsx` it
 *     turned `data-[side=left]:border-r` into `data-[side=left]:border-e`
 *     while leaving the neighbouring `data-[side=left]:left-0` physical —
 *     so a left-side sheet grew its border on the wrong edge in RTL. It has
 *     no notion of "this class is keyed to an explicitly physical prop".
 *
 * So the transform is ours. Its design, in three rules:
 *
 *   1. **Only class-list string literals are touched.** Eligibility is
 *      decided on the TypeScript AST, not by regex over the file: a string
 *      qualifies when it sits inside a `className`/`class` JSX attribute, a
 *      `className:` property, or a call to `cn` / `cva` / `clsx` /
 *      `twMerge` / `tv` (which covers cva `variants` maps). Everything
 *      else — prose, message keys, URLs, `Record<BoxBorder, string>` maps —
 *      is invisible to it.
 *   2. **Edits are offset splices into the original text.** The file is
 *      never re-printed. Comments, pragmas, formatting and quote style
 *      survive byte-for-byte, which is precisely the CLI's fatal flaw.
 *   3. **Only whole class tokens in the MAPPINGS table change**, variant
 *      prefixes (`sm:`, `data-[…]:`, `group-hover:`, `*:`) and a leading
 *      `-` preserved. Positional utilities (`left-*`, `right-*`, `inset-*`,
 *      `origin-*`, `translate-*`) are deliberately NOT in the table: those
 *      need an `rtl:` variant or a physical intent decision, so they are
 *      hand-reviewed, never batch-rewritten.
 *
 * EXCLUSIONS are the other half of correctness — see EXCLUSIONS below. Some
 * physical classes are physical ON PURPOSE and mirroring them is the bug.
 *
 *   pnpm run rtl:apply --dry-run    # report every site, write nothing
 *   pnpm run rtl:apply              # apply
 *   pnpm run rtl:apply --report     # also list untouched physical classes
 *
 * After applying: `pnpm run gen:design` (DESIGN.md reads component source),
 * then `pnpm run typecheck && pnpm test && pnpm run check && pnpm run build`.
 *
 * No new dependency: `typescript` is already a devDependency and is used
 * only to locate string literals. Dev-time only, never part of the build.
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = join(import.meta.dirname, '..');
const argv = process.argv.slice(2);
const dryRun = argv.includes('--dry-run');
const withReport = argv.includes('--report') || dryRun;

const USAGE = [
  'Usage: pnpm run rtl:apply [--dry-run] [--report]',
  '',
  '  --dry-run   report what would change; write nothing (implies --report).',
  '  --report    also list physical utilities left UNTOUCHED, so the',
  '              hand-reviewed remainder is visible rather than assumed.',
  '',
  'Scope: src/**/*.{ts,tsx}, class-list string literals only.',
].join('\n');

if (argv.includes('--help') || argv.includes('-h')) {
  console.log(USAGE);
  process.exit(0);
}

// ── The substitution table ────────────────────────────────────────────────
// Each entry matches ONE whole class token (after its variant prefix and an
// optional leading `-`). `family` groups them so EXCLUSIONS can veto a
// single family in a file rather than the whole file.
const MAPPINGS = [
  { family: 'padding', re: /^pl-(.+)$/, to: (m) => `ps-${m[1]}` },
  { family: 'padding', re: /^pr-(.+)$/, to: (m) => `pe-${m[1]}` },
  { family: 'margin', re: /^ml-(.+)$/, to: (m) => `ms-${m[1]}` },
  { family: 'margin', re: /^mr-(.+)$/, to: (m) => `me-${m[1]}` },
  { family: 'text-align', re: /^text-left$/, to: () => 'text-start' },
  { family: 'text-align', re: /^text-right$/, to: () => 'text-end' },
  { family: 'border', re: /^border-l$/, to: () => 'border-s' },
  { family: 'border', re: /^border-r$/, to: () => 'border-e' },
  { family: 'border', re: /^border-l-(.+)$/, to: (m) => `border-s-${m[1]}` },
  { family: 'border', re: /^border-r-(.+)$/, to: (m) => `border-e-${m[1]}` },
  { family: 'radius', re: /^rounded-l-(.+)$/, to: (m) => `rounded-s-${m[1]}` },
  { family: 'radius', re: /^rounded-r-(.+)$/, to: (m) => `rounded-e-${m[1]}` },
  {
    family: 'radius',
    re: /^rounded-tl-(.+)$/,
    to: (m) => `rounded-ss-${m[1]}`,
  },
  {
    family: 'radius',
    re: /^rounded-tr-(.+)$/,
    to: (m) => `rounded-se-${m[1]}`,
  },
  {
    family: 'radius',
    re: /^rounded-bl-(.+)$/,
    to: (m) => `rounded-es-${m[1]}`,
  },
  {
    family: 'radius',
    re: /^rounded-br-(.+)$/,
    to: (m) => `rounded-ee-${m[1]}`,
  },
  { family: 'scroll', re: /^scroll-pl-(.+)$/, to: (m) => `scroll-ps-${m[1]}` },
  { family: 'scroll', re: /^scroll-pr-(.+)$/, to: (m) => `scroll-pe-${m[1]}` },
  { family: 'scroll', re: /^scroll-ml-(.+)$/, to: (m) => `scroll-ms-${m[1]}` },
  { family: 'scroll', re: /^scroll-mr-(.+)$/, to: (m) => `scroll-me-${m[1]}` },
];

/**
 * Classes that are physical ON PURPOSE. Mirroring these is the bug, not the
 * fix — every entry names the invariant that makes it physical.
 *
 * `families: '*'` vetoes the whole file; a list vetoes just those families,
 * so a file can keep its physical edge semantics while its ordinary
 * `text-left`/`pl-*` still convert.
 */
const EXCLUSIONS = [
  {
    file: 'src/components/ui/sheet.tsx',
    families: ['border', 'radius', 'padding', 'margin'],
    reason:
      '`side="left" | "right"` is an explicitly PHYSICAL public prop. The ' +
      'edge classes are keyed to `data-[side=left|right]` and pair with ' +
      '`left-0`/`right-0`, which have no logical form. Mirroring only the ' +
      'border (what the CLI did) puts it on the wrong edge in RTL.',
  },
  {
    file: 'src/components/ui/drawer.tsx',
    families: ['border', 'radius'],
    reason:
      'Same physical-side contract as sheet: `data-[swipe-direction=…]` ' +
      'edges pair with `left-0`/`right-full`/`origin-left`. (Its plain ' +
      '`md:text-left` header alignment is NOT physical and does convert.)',
  },
  {
    file: 'src/components/layout/box.tsx',
    families: '*',
    reason:
      '`BoxBorder` is a public API whose literal keys are `left`/`right`. ' +
      'The map value must keep matching the key name. (Belt and braces: ' +
      'the map is a plain object, so it is not class-list-eligible anyway.)',
  },
  {
    file: 'src/components/ui/calendar.tsx',
    families: ['radius'],
    reason:
      'Range-edge radii are tied to nth-child POSITION ' +
      '(`[&:first-child…]:rounded-l-*`), and the DOM order of a calendar ' +
      'week does not flip — the browser lays the row out RTL for us. ' +
      'Mirroring the radius would round the wrong end of the range.',
  },
  {
    file: 'src/components/preview/preview-toolbar.tsx',
    families: '*',
    reason:
      'The sandbox QA toolbar is a fixed dev-only corner overlay, ' +
      'deliberately anchored to one physical corner in both directions so ' +
      'it never lands on top of the surface under test.',
  },
  {
    file: 'src/components/employer/employer-stats-chart.tsx',
    families: '*',
    reason:
      'recharts `margin={{ left, right }}` are JS props on a chart that ' +
      'lays out LTR internally. (Not class-list-eligible either.)',
  },
  {
    file: 'src/components/employer/employer-profile-views-stat.tsx',
    families: '*',
    reason: 'Same recharts physical margin props as employer-stats-chart.',
  },
];

/** Families vetoed for a file, or null when the file is fully in scope. */
function exclusionFor(relPath) {
  return EXCLUSIONS.find((entry) => entry.file === relPath) ?? null;
}

function isExcluded(exclusion, family) {
  if (!exclusion) return false;
  return exclusion.families === '*' || exclusion.families.includes(family);
}

// ── The surface ───────────────────────────────────────────────────────────
/** Every .ts/.tsx file under src/, in stable order. */
function surfaceFiles() {
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir).sort()) {
      if (entry === 'node_modules') continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.tsx?$/.test(entry)) out.push(full);
    }
  };
  walk(join(root, 'src'));
  return out;
}

/** Call expressions whose string arguments are class lists. */
const CLASS_CALLEES = new Set([
  'cn',
  'cva',
  'clsx',
  'classNames',
  'twMerge',
  'tv',
]);
/** JSX attributes / object properties whose string value is a class list. */
const CLASS_NAMES = new Set([
  'className',
  'class',
  'classNames',
  'indicatorClassName',
]);

/**
 * Is this string literal a class list? Decided on ANCESTORS, so the value
 * itself is never guessed at:
 *   <div className="…">            → yes
 *   cn('…', className)             → yes
 *   cva('…', { variants: { … } })  → yes (any string under the call)
 *   { className: '…' }             → yes
 *   t('pl-2 is a weird message')   → no
 */
function isClassList(node) {
  for (let cursor = node.parent; cursor; cursor = cursor.parent) {
    if (ts.isJsxAttribute(cursor)) {
      return CLASS_NAMES.has(cursor.name.getText());
    }
    if (ts.isCallExpression(cursor)) {
      const callee = cursor.expression;
      const name = ts.isIdentifier(callee)
        ? callee.text
        : ts.isPropertyAccessExpression(callee)
          ? callee.name.text
          : '';
      if (CLASS_CALLEES.has(name)) return true;
    }
    if (
      ts.isPropertyAssignment(cursor) &&
      (ts.isIdentifier(cursor.name) || ts.isStringLiteral(cursor.name)) &&
      CLASS_NAMES.has(cursor.name.text)
    ) {
      return true;
    }
    // A statement boundary means we never found a class context.
    if (ts.isStatement(cursor) && !ts.isReturnStatement(cursor)) break;
  }
  return false;
}

/**
 * Split a class token into `[variantPrefix, negation, base]`.
 * `sm:data-[open]:-ml-2` → `['sm:data-[open]:', '-', 'ml-2']`.
 * Bracket-aware, so `data-[side=left]:` is one prefix, not two.
 */
function splitToken(token) {
  let depth = 0;
  let lastColon = -1;
  for (let i = 0; i < token.length; i += 1) {
    const ch = token[i];
    if (ch === '[' || ch === '(') depth += 1;
    else if (ch === ']' || ch === ')') depth -= 1;
    else if (ch === ':' && depth === 0) lastColon = i;
  }
  const prefix = token.slice(0, lastColon + 1);
  let base = token.slice(lastColon + 1);
  const negated = base.startsWith('-');
  if (negated) base = base.slice(1);
  return [prefix, negated ? '-' : '', base];
}

/** Physical utilities this script deliberately does NOT rewrite. */
const REVIEW_ONLY =
  /^(-?(left|right)-|inset-[lr]|origin-(top-|bottom-)?(left|right)$|float-(left|right)$|clear-(left|right)$|border-[lr]-|(translate|-translate)-x-)/;

// ── The pass ──────────────────────────────────────────────────────────────
const changesByFamily = new Map();
const changedFiles = [];
const skipped = [];
const untouched = [];
const ineligible = [];

for (const file of surfaceFiles()) {
  const relPath = relative(root, file);
  const original = readFileSync(file, 'utf8');
  const exclusion = exclusionFor(relPath);

  const source = ts.createSourceFile(
    relPath,
    original,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    relPath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  /** @type {{start:number,end:number,text:string}[]} */
  const edits = [];
  let fileChanges = 0;

  const visit = (node) => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const eligible = isClassList(node);
      const raw = node.text;
      const tokens = raw.split(/(\s+)/);
      let touched = false;
      const rewritten = tokens.map((token) => {
        if (!token.trim()) return token;
        const [prefix, negation, base] = splitToken(token);
        for (const mapping of MAPPINGS) {
          const match = mapping.re.exec(base);
          if (!match) continue;
          if (!eligible) {
            // A physical class in a string the AST does not consider a
            // class list. Never rewritten blind — surfaced for review.
            ineligible.push({ file: relPath, token });
            return token;
          }
          if (isExcluded(exclusion, mapping.family)) {
            skipped.push({ file: relPath, token, family: mapping.family });
            return token;
          }
          touched = true;
          fileChanges += 1;
          changesByFamily.set(
            mapping.family,
            (changesByFamily.get(mapping.family) ?? 0) + 1,
          );
          return `${prefix}${negation}${mapping.to(match)}`;
        }
        if (withReport && eligible && REVIEW_ONLY.test(`${negation}${base}`)) {
          untouched.push({ file: relPath, token });
        }
        return token;
      });
      if (touched) {
        // Splice into the ORIGINAL text between the literal's quotes, so
        // quote style, escapes outside the class list, and every byte of
        // surrounding formatting and comments are preserved verbatim.
        edits.push({
          start: node.getStart(source) + 1,
          end: node.getEnd() - 1,
          text: rewritten.join(''),
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);

  if (fileChanges > 0) {
    changedFiles.push({ file: relPath, count: fileChanges });
    if (!dryRun) {
      let next = original;
      for (const edit of [...edits].sort((a, b) => b.start - a.start)) {
        next = next.slice(0, edit.start) + edit.text + next.slice(edit.end);
      }
      writeFileSync(file, next);
    }
  }
}

// ── The report ────────────────────────────────────────────────────────────
const total = [...changesByFamily.values()].reduce((a, b) => a + b, 0);

console.log(
  `\nRTL utility pass${dryRun ? ' (dry run — nothing written)' : ''}`,
);
console.log(`  surface        src/**/*.{ts,tsx}`);
console.log(`  files changed  ${changedFiles.length}`);
console.log(`  classes        ${total}\n`);

for (const [family, count] of [...changesByFamily].sort(
  (a, b) => b[1] - a[1],
)) {
  console.log(`    ${family.padEnd(12)} ${String(count).padStart(4)}`);
}

console.log('\n  Densest files:');
for (const entry of [...changedFiles]
  .sort((a, b) => b.count - a.count)
  .slice(0, 12)) {
  console.log(`    ${String(entry.count).padStart(4)}  ${entry.file}`);
}

if (skipped.length > 0) {
  console.log(
    `\n  ${skipped.length} class(es) LEFT PHYSICAL by the exclusion list:`,
  );
  const byFile = new Map();
  for (const entry of skipped) {
    byFile.set(entry.file, [...(byFile.get(entry.file) ?? []), entry.token]);
  }
  for (const [file, tokens] of byFile) {
    console.log(`    ${file}  (${tokens.length})`);
  }
  console.log(
    '    …see EXCLUSIONS in this script for why each one is physical.',
  );
}

if (withReport && untouched.length > 0) {
  const byFile = new Map();
  for (const entry of untouched) {
    byFile.set(entry.file, [...(byFile.get(entry.file) ?? []), entry.token]);
  }
  console.log(
    `\n  ${untouched.length} positional utility/utilities NOT rewritten ` +
      '(need an `rtl:` variant or are deliberately physical — hand review):',
  );
  for (const [file, tokens] of [...byFile].sort()) {
    console.log(`    ${file}`);
    console.log(`      ${[...new Set(tokens)].join(' ')}`);
  }
}

if (withReport && ineligible.length > 0) {
  const byFile = new Map();
  for (const entry of ineligible) {
    byFile.set(entry.file, [...(byFile.get(entry.file) ?? []), entry.token]);
  }
  console.log(
    `\n  ${ineligible.length} physical class(es) in strings the AST does NOT ` +
      'treat as class lists (never rewritten blind — review by hand):',
  );
  for (const [file, tokens] of [...byFile].sort()) {
    console.log(`    ${file}`);
    console.log(`      ${[...new Set(tokens)].join(' ')}`);
  }
}

if (!dryRun && changedFiles.length > 0) {
  console.log(
    '\n  Next: pnpm run gen:design && pnpm run check && pnpm run typecheck ' +
      '&& pnpm test && pnpm run build',
  );
}
console.log('');
