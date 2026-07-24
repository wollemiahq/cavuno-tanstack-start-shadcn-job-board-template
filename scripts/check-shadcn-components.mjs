import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

const root = process.cwd();
const usageJsonPath = resolve(root, 'docs/shadcn-component-usage.json');
const usageMarkdownPath = resolve(root, 'docs/shadcn-components.md');

const registryComponents = [
  'accordion',
  'alert',
  'alert-dialog',
  'aspect-ratio',
  'attachment',
  'avatar',
  'badge',
  'breadcrumb',
  'bubble',
  'button',
  'button-group',
  'calendar',
  'card',
  'carousel',
  'chart',
  'checkbox',
  'collapsible',
  'combobox',
  'command',
  'context-menu',
  'dialog',
  'direction',
  'drawer',
  'dropdown-menu',
  'empty',
  'field',
  'hover-card',
  'input',
  'input-group',
  'input-otp',
  'item',
  'kbd',
  'label',
  'marker',
  'menubar',
  'message',
  'message-scroller',
  'native-select',
  'navigation-menu',
  'pagination',
  'popover',
  'progress',
  'radio-group',
  'resizable',
  'scroll-area',
  'select',
  'separator',
  'sheet',
  'sidebar',
  'skeleton',
  'slider',
  'sonner',
  'spinner',
  'switch',
  'table',
  'tabs',
  'textarea',
  'toggle',
  'toggle-group',
  'tooltip',
];

const registryCompositions = [
  {
    name: 'form',
    implementation: 'Field + React Hook Form',
    note: 'The CLI resolves dependencies but does not create form.tsx.',
  },
  {
    name: 'data-table',
    implementation: 'Table + @tanstack/react-table',
    note: 'Documentation composition, not a standalone registry file.',
  },
  {
    name: 'date-picker',
    implementation: 'Calendar + Popover',
    note: 'Documentation composition, not a standalone registry file.',
  },
  {
    name: 'toast',
    implementation: 'Sonner',
    note: 'The current component catalog directs new work to Sonner.',
  },
  {
    name: 'typography',
    implementation: 'src/typeset.css',
    note: 'Project-wide typeset layer rather than a React component file.',
  },
];

function productionSources(directory) {
  if (!existsSync(directory)) return [];

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    const projectPath = relative(root, path).replaceAll('\\', '/');

    if (entry.isDirectory()) {
      if (projectPath === 'src/components/ui') return [];
      return productionSources(path);
    }

    if (!['.ts', '.tsx'].includes(extname(entry.name))) return [];
    if (/\.(test|spec|stories)\.[^.]+$/.test(entry.name)) return [];
    return [path];
  });
}

function installedComponents() {
  return readdirSync(resolve(root, 'src/components/ui'), {
    withFileTypes: true,
  })
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.endsWith('.tsx') &&
        !entry.name.endsWith('.test.tsx'),
    )
    .map((entry) => entry.name.replace(/\.tsx$/, ''))
    .sort();
}

function productionReferences() {
  const references = new Map(
    registryComponents.map((component) => [component, new Set()]),
  );
  const importPattern = /(?:@\/components\/ui\/|\.\/ui\/)([a-z0-9-]+)/g;

  for (const file of productionSources(resolve(root, 'src'))) {
    const source = readFileSync(file, 'utf8');
    const projectPath = relative(root, file).replaceAll('\\', '/');

    for (const match of source.matchAll(importPattern)) {
      const component = match[1];
      if (!references.has(component)) {
        throw new Error(
          `${projectPath} imports unregistered shadcn component "${component}".`,
        );
      }
      references.get(component).add(projectPath);
    }
  }

  return references;
}

function validateConfiguration() {
  const config = JSON.parse(
    readFileSync(resolve(root, 'components.json'), 'utf8'),
  );
  const expected = {
    style: 'base-rhea',
    rsc: false,
    theme: 'src/theme.css',
  };
  const actual = {
    style: config.style,
    rsc: config.rsc,
    theme: config.tailwind?.css,
  };

  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `components.json does not match the starter contract: ${JSON.stringify(actual)}`,
    );
  }
  if (
    typeof config.iconLibrary !== 'string' ||
    config.iconLibrary.length === 0
  ) {
    throw new Error('components.json must declare one iconLibrary.');
  }

  return { ...actual, iconLibrary: config.iconLibrary };
}

function buildArtifacts() {
  const installed = installedComponents();
  const expected = [...registryComponents].sort();
  if (JSON.stringify(installed) !== JSON.stringify(expected)) {
    const missing = expected.filter((name) => !installed.includes(name));
    const extra = installed.filter((name) => !expected.includes(name));
    throw new Error(
      `shadcn registry files drifted. Missing: ${missing.join(', ') || 'none'}. Extra: ${extra.join(', ') || 'none'}.`,
    );
  }
  if (!existsSync(resolve(root, 'src/hooks/use-mobile.ts'))) {
    throw new Error(
      'The shadcn support file src/hooks/use-mobile.ts is missing.',
    );
  }

  const config = validateConfiguration();
  const references = productionReferences();
  const components = registryComponents.map((name) => {
    const production = [...references.get(name)].sort();
    return {
      name,
      status: production.length > 0 ? 'used' : 'available',
      productionReferences: production,
    };
  });
  const used = components.filter((component) => component.status === 'used');
  const available = components.filter(
    (component) => component.status === 'available',
  );
  const report = {
    schemaVersion: 1,
    registry: 'https://ui.shadcn.com/r/index.json',
    installCommand: 'pnpm exec shadcn add --all --yes --overwrite',
    config,
    installedFiles: {
      componentFiles: components.length,
      supportFiles: ['src/hooks/use-mobile.ts'],
      total: components.length + 1,
    },
    summary: {
      used: used.length,
      available: available.length,
    },
    registryCompositions,
    components,
  };

  const rows = components.map((component) => {
    const references = component.productionReferences;
    const status =
      references.length > 0 ? `Used (${references.length})` : 'Available';
    const examples = references
      .slice(0, 3)
      .map((path) => `\`${path}\``)
      .join('<br>');
    const remaining = references.length - 3;
    const usage = examples
      ? `${examples}${remaining > 0 ? `<br>+${remaining} more in the JSON ledger` : ''}`
      : 'Installed for adoption when the product needs this behavior.';
    return `| \`${component.name}\` | ${status} | ${usage} |`;
  });
  const compositionRows = registryCompositions.map(
    (entry) =>
      `| \`${entry.name}\` | ${entry.implementation} | ${entry.note} |`,
  );
  const markdown = `# shadcn component inventory

This standalone starter owns the complete shadcn (Base UI) source set generated by \`${report.installCommand}\`. The machine-readable [usage ledger](./shadcn-component-usage.json) records every production import so humans and LLMs can distinguish an installed primitive from one the product currently needs.

## Configuration

- Base: Base UI through the \`base-rhea\` style.
- Theme: \`src/theme.css\`.
- Icons: Lucide.
- Installed source: ${report.installedFiles.componentFiles} UI components plus \`src/hooks/use-mobile.ts\` (${report.installedFiles.total} files total).
- Production adoption: ${report.summary.used} used, ${report.summary.available} available.

Installing every primitive is a source-ownership and discoverability decision. It is not a requirement to render every primitive: use the semantic component that fits the interaction instead of manufacturing UI solely to increase the used count.

## Component cross-reference

| Component | Status | Production references |
| --- | --- | --- |
${rows.join('\n')}

## Registry compositions

Some entries in the public component documentation are compositions or successors rather than additional files created by \`add --all\`.

| Entry | Starter implementation | Why there is no same-named file |
| --- | --- | --- |
${compositionRows.join('\n')}

## Owned accessibility extensions

The source remains intentionally owned after installation. Small extensions preserve the starter's localization and accessibility contracts:

- \`DialogContent\` shows a close control only when the caller supplies both \`showCloseButton\` and a localized \`closeLabel\`.
- \`SheetContent\` follows the same opt-in, localized close-control contract.
- \`MessageScrollerButton\` requires a localized \`label\` instead of embedding an English-only screen-reader string.
- Breadcrumb, carousel, pagination, sidebar, and spinner accessible names come from Paraglide messages or required caller-supplied labels.
- \`Skeleton\` disables its pulse animation when the user requests reduced motion.

## Messaging component coverage

The text-messaging experience composes \`Bubble\`, \`Marker\`, \`Message\`, and \`MessageScroller\`. \`Attachment\` is installed and used by resume upload, but Cavuno's current messaging API accepts message bodies only; the starter does not present a fake message-attachment action that cannot be sent.

Run \`pnpm run gen:shadcn\` after adding or removing production imports. \`pnpm run check:shadcn\` fails when the installed registry, configuration, JSON ledger, or this document drifts.
`;

  return {
    json: `${JSON.stringify(report, null, 2)}\n`,
    markdown,
  };
}

const artifacts = buildArtifacts();
if (process.argv.includes('--write')) {
  writeFileSync(usageJsonPath, artifacts.json);
  writeFileSync(usageMarkdownPath, artifacts.markdown);
  console.log('Updated shadcn component inventory.');
  process.exit(0);
}

const drift = [
  [usageJsonPath, artifacts.json],
  [usageMarkdownPath, artifacts.markdown],
].filter(
  ([path, expected]) =>
    !existsSync(path) || readFileSync(path, 'utf8') !== expected,
);

if (drift.length > 0) {
  for (const [path] of drift) {
    console.error(`${relative(root, path)} is missing or stale.`);
  }
  console.error('Run pnpm run gen:shadcn to update the inventory.');
  process.exit(1);
}

console.log(
  'shadcn component inventory is complete and matches production usage.',
);
