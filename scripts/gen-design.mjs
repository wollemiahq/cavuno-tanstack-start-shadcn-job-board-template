import {
  generateDesignArtifacts,
  generateDesignFrontmatter,
  spliceDesignFrontmatter,
} from './gen-design-lib.mjs';
import { writeFileIfChanged } from './write-if-changed.mjs';

/**
 * Writes DESIGN.md + design/tokens.dtcg.json
 * from canonical sources (see gen-design-lib.mjs).
 *
 *   pnpm run gen:design                      regenerate both artifacts
 *   pnpm run gen:design -- --check           exit 1 if committed files drift
 *   pnpm run gen:design -- --frontmatter     regenerate ONLY the DESIGN.md
 *                                            frontmatter (+ DTCG), body kept —
 *                                            customized body preserved
 *   pnpm run gen:design -- --frontmatter --check   exit 1 on frontmatter drift,
 *                                            body edits tolerated
 *   pnpm run gen:design -- --refresh-registry  refetch design/registry-items.json
 *                                              from the public registry first
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const args = process.argv.slice(2);

if (args.includes('--refresh-registry')) {
  const res = await fetch('https://cavuno.com/r/registry.json');
  if (!res.ok) {
    console.error(`registry fetch failed: HTTP ${res.status}`);
    process.exit(1);
  }
  const body = await res.json();
  writeFileSync(
    join(root, 'design', 'registry-items.json'),
    JSON.stringify(body, null, 4) + '\n',
  );
  console.log('design/registry-items.json refreshed');
}

// --frontmatter regenerates only token-derived frontmatter and the DTCG
// export, preserving the existing DESIGN.md body.
let targets;
if (args.includes('--frontmatter')) {
  const { frontmatterBlock, dtcgJson } = await generateDesignFrontmatter(root);
  const current = readFileSync(join(root, 'DESIGN.md'), 'utf8');
  targets = [
    ['DESIGN.md', spliceDesignFrontmatter(current, frontmatterBlock)],
    ['design/tokens.dtcg.json', dtcgJson],
  ];
} else {
  const { designMd, dtcgJson } = await generateDesignArtifacts(root);
  targets = [
    ['DESIGN.md', designMd],
    ['design/tokens.dtcg.json', dtcgJson],
  ];
}

if (args.includes('--check')) {
  const drifted = targets.filter(
    ([file, content]) => readFileSync(join(root, file), 'utf8') !== content,
  );
  if (drifted.length > 0) {
    console.error(
      `generated artifacts drifted (hand-edit or stale): ${drifted
        .map(([f]) => f)
        .join(
          ', ',
        )} — run \`pnpm run gen:design -- --frontmatter\` (keeps the DESIGN.md body)`,
    );
    process.exit(1);
  }
  console.log('DESIGN.md + DTCG export match their sources');
} else {
  for (const [file, content] of targets) {
    // Unchanged bytes stay untouched: a rewrite is a reload on a live dev
    // server (see write-if-changed.mjs).
    const wrote = writeFileIfChanged(join(root, file), content);
    console.log(wrote ? `wrote ${file}` : `${file} unchanged`);
  }
  try {
    execSync('git --no-pager diff --stat -- DESIGN.md design/', {
      cwd: root,
      stdio: 'inherit',
    });
  } catch {
    // git absent (sandbox) — the write already succeeded.
  }
}
