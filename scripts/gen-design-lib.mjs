// Uses the TS Program/type-checker API (createProgram, TypeChecker) to extract
// component prop types. TS 7.0's default export is `version`-only and its
// programmatic API is unstable until 7.1, so this stays on the TS 6 API via the
// @typescript/typescript6 compat package while the project runs tsc on TS 7.
import ts from 'typescript-6';

import { parseTokens } from './theme-resolved-lib.mjs';

/**
 * DESIGN.md + DTCG generator (Builder-2 Phase 1; ADR-0066 D15).
 *
 * Emits the two agent-facing design-system artifacts from canonical
 * sources ONLY — generated-or-nothing, hand-authored parallel
 * manifests are forbidden:
 *
 *   DESIGN.md               Google Labs design.md spec, pinned `alpha`:
 *                           YAML-frontmatter tokens derived from
 *                           src/theme.css (ADR-0065 D1 canonical) +
 *                           body sections; the Components inventory is
 *                           extracted from src/components source with
 *                           the TypeScript checker (react-docgen-class
 *                           tooling) enriched by the registry item
 *                           snapshot (design/registry-items.json,
 *                           fetched from cavuno.com/r).
 *   design/tokens.dtcg.json DTCG 2025.10 interchange export of the
 *                           same tokens.
 *
 * Output is deterministic (stable ordering, LF, trailing newline):
 * CI regenerates and diffs — any hand-edit fails the check.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const DESIGN_SPEC_VERSION = 'alpha';

// ── tokens ──────────────────────────────────────────────────────────

/** Strip the leading `--` from a custom-property name. */
const bare = (name) => name.replace(/^--/, '');

const FONT_VARS = new Set(['--font-sans', '--font-heading']);

/** The color custom properties of a parsed block, in file order. */
function colorEntries(block) {
  return Object.entries(block).filter(
    ([name]) => !FONT_VARS.has(name) && name !== '--radius',
  );
}

// ── component extraction (TypeScript checker) ───────────────────────

function componentFiles(root) {
  const dir = join(root, 'src', 'components');
  const out = [];
  const walk = (d) => {
    for (const entry of readdirSync(d, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      const full = join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.tsx') && !entry.name.endsWith('.test.tsx'))
        out.push(full);
    }
  };
  walk(dir);
  return out;
}

/** cva() variant maps in a source file, keyed by the defining identifier. */
function extractCvaVariants(sourceFile) {
  const definitions = {};
  const visit = (node) => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      ts.isCallExpression(node.initializer) &&
      ts.isIdentifier(node.initializer.expression) &&
      node.initializer.expression.text === 'cva' &&
      node.initializer.arguments.length >= 2 &&
      ts.isObjectLiteralExpression(node.initializer.arguments[1])
    ) {
      const variants = {};
      for (const prop of node.initializer.arguments[1].properties) {
        if (
          ts.isPropertyAssignment(prop) &&
          prop.name.getText(sourceFile) === 'variants' &&
          ts.isObjectLiteralExpression(prop.initializer)
        ) {
          for (const variant of prop.initializer.properties) {
            if (
              ts.isPropertyAssignment(variant) &&
              ts.isObjectLiteralExpression(variant.initializer)
            ) {
              variants[variant.name.getText(sourceFile)] =
                variant.initializer.properties.map((v) =>
                  v.name.getText(sourceFile),
                );
            }
          }
        }
      }
      definitions[node.name.text] = variants;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return definitions;
}

/**
 * Exported React components per file, with prop metadata from the
 * checker: [{ name, file, props: [{ name, type, optional }], variants }].
 */
export function extractComponents(root) {
  const files = componentFiles(root);
  const program = ts.createProgram(files, {
    jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    target: ts.ScriptTarget.ES2022,
    strict: true,
    skipLibCheck: true,
    baseUrl: root,
    // Mirror tsconfig's aliases: without '@/*' every `@/…`-imported prop
    // type fails to resolve and optional ones collapse to `any` in DESIGN.md.
    paths: { '#/*': ['./src/*'], '@/*': ['./src/*'] },
  });
  const checker = program.getTypeChecker();
  const components = [];

  for (const file of files) {
    const source = program.getSourceFile(file);
    if (!source) continue;
    const moduleSymbol = checker.getSymbolAtLocation(source);
    if (!moduleSymbol) continue;
    const variantDefinitions = extractCvaVariants(source);

    for (const symbol of checker.getExportsOfModule(moduleSymbol)) {
      const name = symbol.getName();
      if (!/^[A-Z]/.test(name)) continue;
      const componentSymbol =
        symbol.flags & ts.SymbolFlags.Alias
          ? checker.getAliasedSymbol(symbol)
          : symbol;
      const declaration =
        componentSymbol.valueDeclaration ?? componentSymbol.declarations?.[0];
      const type = checker.getTypeOfSymbolAtLocation(
        componentSymbol,
        declaration ?? source,
      );
      const signature = type.getCallSignatures()[0];
      if (!signature) continue; // not a function component
      const declarationText = declaration?.getText(source) ?? '';
      const variants = {};
      for (const [identifier, definition] of Object.entries(
        variantDefinitions,
      )) {
        if (new RegExp(`\\b${identifier}\\b`).test(declarationText)) {
          Object.assign(variants, definition);
        }
      }
      const props = [];
      const propsParam = signature.getParameters()[0];
      if (propsParam) {
        const propsType = checker.getTypeOfSymbolAtLocation(
          propsParam,
          propsParam.valueDeclaration ?? source,
        );
        for (const prop of propsType.getProperties()) {
          // Inventory the component's OWN contract: keep only props
          // declared in this repo's source. DOM passthrough surfaces
          // (React.ComponentProps<'button'> & …) declare their members
          // in lib/node_modules files — or nowhere at all for mapped
          // types — and would bury the real API under hundreds of
          // aria-* entries.
          const declFile = (prop.valueDeclaration ?? prop.declarations?.[0])
            ?.getSourceFile()
            .fileName.split('\\')
            .join('/');
          if (!declFile || !declFile.startsWith(root.split('\\').join('/')))
            continue;
          if (/node_modules/.test(declFile)) continue;
          const typeText = checker.typeToString(
            checker.getTypeOfSymbolAtLocation(
              prop,
              prop.valueDeclaration ?? source,
            ),
          );
          props.push({
            name: prop.getName(),
            type:
              typeText.length > 120 ? `${typeText.slice(0, 117)}…` : typeText,
            optional: (prop.flags & ts.SymbolFlags.Optional) !== 0,
          });
        }
      }
      props.sort((a, b) => a.name.localeCompare(b.name));
      components.push({
        name,
        file: relative(root, file).split('\\').join('/'),
        props,
        variants,
        description: ts.displayPartsToString(
          componentSymbol.getDocumentationComment(checker),
        ),
        documentation: componentSymbol.getJsDocTags(checker).map((tag) => ({
          name: tag.name,
          text: Array.isArray(tag.text)
            ? tag.text.map((part) => part.text).join('')
            : (tag.text ?? ''),
        })),
      });
    }
  }
  components.sort(
    (a, b) => a.file.localeCompare(b.file) || a.name.localeCompare(b.name),
  );
  return components;
}

// ── registry snapshot ───────────────────────────────────────────────

function registryByBasename(root) {
  const snapshot = JSON.parse(
    readFileSync(join(root, 'design', 'registry-items.json'), 'utf8'),
  );
  const map = new Map();
  for (const item of snapshot.items) map.set(item.name, item);
  return map;
}

/** `src/components/board/job-card.tsx` → `job-card`. */
const fileBasename = (file) => file.replace(/^.*\//, '').replace(/\.tsx$/, '');

// ── patterns (docs/patterns frontmatter) ────────────────────────────

/**
 * The enforced `## ` section order of a pattern page (see
 * docs/patterns/_template.md). Exported so pattern-contract.test.ts and
 * the generator share ONE source of truth.
 */
export const PATTERN_SECTION_ORDER = [
  'Purpose',
  'When to use',
  'Anatomy',
  'Composition',
  "Do / Don't",
  'Used by',
  'Related',
];

/** Required frontmatter keys on every pattern page. */
export const PATTERN_FRONTMATTER_KEYS = [
  'name',
  'purpose',
  'primitives',
  'usedBy',
];

/**
 * Parse one pattern-doc markdown string into its frontmatter + section
 * list. The frontmatter is the flat scalar/flow-array subset this repo's
 * pattern pages use: `key: scalar` or `key: [a, b, c]`. `sections` is the
 * ordered list of `## ` heading titles in the body.
 *
 * @param {string} md
 * @returns {{ name: string, purpose: string, primitives: string[],
 *   usedBy: string[], sections: string[] }}
 */
export function parsePatternDoc(md) {
  const match = md.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) throw new Error('pattern doc has no frontmatter block');
  const [, frontmatter, body] = match;

  const fm = {};
  for (const line of frontmatter.split('\n')) {
    if (!line.trim()) continue;
    const [, key, raw] = line.match(/^([\w-]+):\s*(.*)$/) ?? [];
    if (!key) continue;
    if (/^\[.*\]$/.test(raw)) {
      fm[key] = raw
        .slice(1, -1)
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
    } else {
      fm[key] = raw;
    }
  }

  const sections = [];
  for (const line of body.split('\n')) {
    const heading = line.match(/^##\s+(.+?)\s*$/);
    if (heading) sections.push(heading[1]);
  }

  return {
    name: fm.name ?? '',
    purpose: fm.purpose ?? '',
    primitives: Array.isArray(fm.primitives) ? fm.primitives : [],
    usedBy: Array.isArray(fm.usedBy) ? fm.usedBy : [],
    sections,
  };
}

/** `docs/patterns/*.md` (skipping _template.md + README.md), slug-sorted. */
export function patternDocFiles(root) {
  const dir = join(root, 'docs', 'patterns');
  return readdirSync(dir)
    .filter(
      (f) => f.endsWith('.md') && f !== '_template.md' && f !== 'README.md',
    )
    .sort()
    .map((f) => ({ slug: f.replace(/\.md$/, ''), file: join(dir, f) }));
}

/** Parsed pattern docs (slug-sorted) for the DESIGN.md Patterns section. */
export function readPatternDocs(root) {
  return patternDocFiles(root).map(({ slug, file }) => ({
    slug,
    ...parsePatternDoc(readFileSync(file, 'utf8')),
  }));
}

function patternsSection(patterns) {
  const lines = ['## Patterns', ''];
  lines.push(
    'Named page-level compositions documented under `docs/patterns/`.',
    'Select a pattern before composing a route (index + drift notes in',
    '`docs/patterns/README.md`). Every new page starts with the Page family;',
    'pattern frontmatter adds the components inside that anatomy. Generated',
    'from each page’s frontmatter.',
    '',
  );
  for (const pattern of patterns) {
    lines.push(`### ${pattern.name} — \`docs/patterns/${pattern.slug}.md\``);
    lines.push('', pattern.purpose);
    if (pattern.primitives.length > 0) {
      lines.push('', `Primitives: ${pattern.primitives.join(', ')}`);
    }
    lines.push('');
  }
  return lines.join('\n').replace(/\n+$/, '\n');
}

// ── emission ────────────────────────────────────────────────────────

function frontmatter(tokens) {
  const lines = ['---', `version: ${DESIGN_SPEC_VERSION}`];
  lines.push('name: Cavuno board frontend');
  lines.push(
    'description: Board frontend chassis — generated design-system carrier; sources are src/theme.css, src/components source, and the registry snapshot.',
  );
  lines.push('colors:');
  for (const [name, value] of colorEntries(tokens.light)) {
    lines.push(`  ${bare(name)}: '${value}'`);
  }
  for (const [name, value] of colorEntries(tokens.dark)) {
    lines.push(`  ${bare(name)}-dark: '${value}'`);
  }
  lines.push('typography:');
  lines.push('  sans:');
  lines.push(`    fontFamily: ${tokens.light['--font-sans']}`);
  lines.push('  heading:');
  lines.push(`    fontFamily: ${tokens.light['--font-heading']}`);
  lines.push('---');
  return lines.join('\n');
}

function componentEntries(components, registry, includeContracts = false) {
  const lines = [];
  for (const component of components) {
    lines.push(`### ${component.name} — \`${component.file}\``);
    const item = registry.get(fileBasename(component.file));
    if (item) {
      lines.push('', item.description.trim());
      if (item.docs) lines.push('', `Usage: ${item.docs.trim()}`);
    } else if (component.description) {
      lines.push('', component.description.trim());
    }
    if (component.props.length > 0) {
      lines.push('', 'Props:', '');
      for (const prop of component.props) {
        lines.push(
          `- \`${prop.name}${prop.optional ? '?' : ''}: ${prop.type}\``,
        );
      }
    }
    for (const [variant, values] of Object.entries(component.variants)) {
      lines.push('', `Variants — \`${variant}\`: ${values.join(', ')}`);
    }
    if (includeContracts) {
      const defaults = component.documentation.filter(
        (tag) => tag.name === 'default',
      );
      const invariants = component.documentation.filter(
        (tag) => tag.name === 'invariant',
      );
      if (defaults.length > 0) {
        lines.push('', 'Defaults:', '');
        for (const entry of defaults) lines.push(`- ${entry.text}`);
      }
      if (invariants.length > 0) {
        lines.push('', 'Invariants:', '');
        for (const entry of invariants) lines.push(`- ${entry.text}`);
      }
    }
    lines.push('');
  }
  return lines.join('\n').replace(/\n+$/, '\n');
}

function componentsSection(title, intro, components, registry, contracts) {
  return [
    `## ${title}`,
    '',
    intro,
    '',
    componentEntries(components, registry, contracts),
  ]
    .join('\n')
    .replace(/\n+$/, '\n');
}

export async function generateDesignArtifacts(root) {
  const css = readFileSync(join(root, 'src', 'theme.css'), 'utf8');
  const tokens = parseTokens(css);
  const components = extractComponents(root);
  const registry = registryByBasename(root);
  const layoutPrimitives = new Set([
    'Bleed',
    'Box',
    'Container',
    'Grid',
    'Stack',
  ]);
  const layoutCompositions = new Set([
    'Page',
    'PageContent',
    'PageHeader',
    'PageSection',
  ]);
  const isLayoutComponent = (component) =>
    component.file.startsWith('src/components/layout/');
  const primitives = components.filter(
    (component) =>
      isLayoutComponent(component) && layoutPrimitives.has(component.name),
  );
  const compositions = components.filter(
    (component) =>
      isLayoutComponent(component) && layoutCompositions.has(component.name),
  );
  const uiComponents = components.filter(
    (component) =>
      !primitives.includes(component) && !compositions.includes(component),
  );

  const designMd = [
    frontmatter(tokens),
    '',
    '<!-- GENERATED FILE — do not edit. `pnpm run gen:design` regenerates',
    '     from src/theme.css + component source + design/registry-items.json;',
    '     CI diffs the output and rejects hand-edits (ADR-0066 D15). -->',
    '',
    '## Overview',
    '',
    'A job board frontend for one Cavuno board, grounded in the Board API',
    `via its publishable key. Theme source of truth is \`src/theme.css\``,
    '(mode: ' + (tokens.meta.mode ?? 'system') + '); this file carries the',
    'derived tokens and the component inventory for agents.',
    '',
    'Workspace design intent (operator direction picks, brand decisions,',
    'confirmed assumptions) is reflected below by the builder as normal',
    'commits — structural constraints stay enforced in code.',
    '',
    '## Colors',
    '',
    'Light (`:root`) and dark (`.dark`) values from `src/theme.css`.',
    'Always style through the CSS custom properties',
    '(`var(--primary)`, Tailwind theme utilities) — never hardcode hex',
    'values in components.',
    '',
    '| Token | Light | Dark |',
    '|---|---|---|',
    ...colorEntries(tokens.light).map(
      ([name, value]) =>
        `| \`${name}\` | \`${value}\` | \`${tokens.dark[name] ?? '—'}\` |`,
    ),
    '',
    '## Typography',
    '',
    `- Sans: \`${tokens.light['--font-sans']}\``,
    `- Headings: \`${tokens.light['--font-heading']}\``,
    ...(tokens.meta.fontsImport
      ? ['- Webfont import: `' + tokens.meta.fontsImport + '`']
      : []),
    '',
    'Page titles resolve their size from a primitive variant, never a raw',
    '`text-*` class at the call site. ONE standard page-title size and ONE',
    'larger hero exception:',
    '',
    '- Standard page title (every workspace, form, and content page):',
    '  `text-3xl` via `PageHeader` (default) or `Text variant="heading1"`.',
    '- Hero band (marketing / home top-of-page only): `text-4xl md:text-5xl`',
    '  via `PageHeader size="display"` or `Text variant="display"`.',
    '',
    'Smaller `h1` roles are deliberate and not page titles: the detail',
    'identity band (`Text variant="heading2"`, `text-2xl md:text-3xl`), the',
    'results-count listing heading (`text-lg`), the auth shell, and empty /',
    'error state cards. Never drop a workspace or form page to `text-2xl`.',
    'See `docs/patterns/typography.md`.',
    '',
    '## Layout',
    '',
    'Radius scale rides `--radius` in `src/theme.css` (cards use',
    '`--radius-xl`, controls `--radius-md`). Spacing is Tailwind default',
    'scale; no custom spacing tokens.',
    '',
    'Interactive links and cards share ONE focus ring:',
    '`focus-visible:ring-ring/50 focus-visible:ring-2` (use `focus-within` in',
    'its place only for the stretched-overlay-link card, matching',
    '`SearchResultCard`). Form-control primitives keep the shadcn default',
    'ring; do not invent a third focus idiom.',
    '',
    'Stacking order is the named z-index scale in `src/styles.css`',
    '(`--z-card-overlay` 1 → `--z-floating-stack` 40 → `--z-overlay` 50 →',
    '`--z-preview-toolbar` 60 → `--z-skip-link` 100). Reach for a token',
    '(`z-(--z-…)`, `after:z-(--z-card-overlay)`) instead of a magic `z-[…]`',
    'value so the layering order stays legible in one place.',
    '',
    componentsSection(
      'Layout primitives',
      'Token-backed geometry with constrained responsive APIs. These components deliberately omit `className` and `style`.',
      primitives,
      registry,
      true,
    ),
    componentsSection(
      'Components',
      'Generated inventory of reusable components under `src/components`. This inventory includes explicitly labelled migration-only compatibility components; never select those for new page-level composition.',
      uiComponents,
      registry,
      false,
    ),
    componentsSection(
      'Layout compositions',
      'Page, PageHeader, PageContent, and PageSection are the sole canonical page-level composition family for new work. Compose these contracts instead of hand-rolling containers, headings, or rails; use Bleed for full-width bands.',
      compositions,
      registry,
      true,
    ),
    patternsSection(readPatternDocs(root)),
    "## Do's and Don'ts",
    '',
    "- Do style with the token custom properties; don't hardcode colors.",
    '- Do compose Base UI primitives (`render` prop); never Radix',
    '  `asChild`.',
    '- Do keep components presentational (typed props, no fetching);',
    '  data arrives from route loaders and `src/server/` functions.',
    '- Do compose every new page with `Page`, `PageHeader`, `PageContent`,',
    '  and `PageSection`; do not start new work on migration-only',
    '  `PageBody` or `ListingPageHeader`.',
    "- Do reuse the inventory above; don't duplicate an existing",
    '  component to change its style — extend via props/variants.',
    '- Do edit `src/theme.css` directly or with the shadcn CLI and regenerate',
    "  (`pnpm run gen:theme`); don't edit generated files.",
    "- Don't remove or alter the job-detail JSON-LD or `head()` meta.",
    '',
  ].join('\n');

  return {
    designMd,
    dtcgJson: dtcgExport(tokens),
  };
}

function dtcgExport(tokens) {
  const dtcg = { $schema: 'https://tr.designtokens.org/format/', color: {} };
  for (const [name, value] of colorEntries(tokens.light)) {
    dtcg.color[bare(name)] = { $type: 'color', $value: value };
  }
  for (const [name, value] of colorEntries(tokens.dark)) {
    dtcg.color[`${bare(name)}-dark`] = { $type: 'color', $value: value };
  }
  dtcg.fontFamily = {
    sans: {
      $type: 'fontFamily',
      $value: splitFontStack(tokens.light['--font-sans']),
    },
    heading: {
      $type: 'fontFamily',
      $value: splitFontStack(tokens.light['--font-heading']),
    },
  };
  const radius = tokens.light['--radius'].match(/^([\d.]+)(rem)$/);
  if (!radius) {
    throw new Error('Expected --radius to be a rem dimension');
  }
  dtcg.dimension = {
    radius: {
      $type: 'dimension',
      $value: { value: Number(radius[1]), unit: radius[2] },
    },
  };
  return (
    JSON.stringify(dtcg, null, 2).replace(
      /"\$value": \[\n((?:\s+"(?:[^"\\]|\\.)+",?\n)+)\s+\]/g,
      (_match, values) =>
        `"$value": [${values
          .trim()
          .split('\n')
          .map((line) => line.trim())
          .join(' ')}]`,
    ) + '\n'
  );
}

/**
 * Frontmatter-only generation for BUILDER WORKSPACES (ADR-0066 D15):
 * the DESIGN.md body accumulates per-workspace design intent there, so
 * the platform regenerates/checks only the tokens-derived frontmatter
 * (plus the DTCG export, which has no body concept).
 */
export async function generateDesignFrontmatter(root) {
  const css = readFileSync(join(root, 'src', 'theme.css'), 'utf8');
  const tokens = parseTokens(css);
  return {
    frontmatterBlock: frontmatter(tokens),
    dtcgJson: dtcgExport(tokens),
  };
}

const FRONTMATTER_BLOCK = /^---\n[\s\S]*?\n---/;

/** Replace a document's leading frontmatter block, preserving the body. */
export function spliceDesignFrontmatter(designMd, frontmatterBlock) {
  if (!FRONTMATTER_BLOCK.test(designMd)) {
    throw new Error('DESIGN.md has no frontmatter block to replace');
  }
  return designMd.replace(FRONTMATTER_BLOCK, frontmatterBlock);
}

function splitFontStack(stack) {
  return stack.split(',').map((f) => f.trim().replace(/^['"]|['"]$/g, ''));
}

// ── frontmatter reader (for tests/consumers) ────────────────────────

/**
 * Parse the YAML-subset frontmatter this generator emits (flat scalar
 * maps nested by 2-space indentation). Not a general YAML parser.
 *
 * @param {string} designMd
 * @returns {{ version: string, name: string, description: string,
 *   colors: Record<string, string>,
 *   typography: Record<string, Record<string, string>> }}
 */
export function parseDesignFrontmatter(designMd) {
  const match = designMd.match(/^---\n([\s\S]*?)\n---/);
  if (!match) throw new Error('DESIGN.md has no frontmatter block');
  const out = {};
  const stack = [{ indent: -1, node: out }];
  for (const line of match[1].split('\n')) {
    if (!line.trim()) continue;
    const indent = line.length - line.trimStart().length;
    const [, key, value] = line.trim().match(/^([\w-]+):\s*(.*)$/) ?? [];
    if (!key) continue;
    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }
    const parent = stack[stack.length - 1].node;
    if (value === '') {
      const child = {};
      parent[key] = child;
      stack.push({ indent, node: child });
    } else {
      parent[key] = value.replace(/^'(.*)'$/, '$1');
    }
  }
  return out;
}
