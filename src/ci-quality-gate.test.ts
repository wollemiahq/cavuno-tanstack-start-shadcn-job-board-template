import { describe, expect, it } from 'vitest';

import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

describe('CI quality gate', () => {
  it('checks formatting and lint without mutating the checkout', () => {
    const workflow = readFileSync(
      resolve(process.cwd(), '.github/workflows/ci.yml'),
      'utf8',
    );

    expect(workflow).toContain('- name: Lint and formatting');
    expect(workflow).toContain('run: pnpm run check');
    expect(workflow).not.toContain('--fix');
  });

  it('pins every external action to an immutable commit SHA', () => {
    const workflowDirectory = resolve(process.cwd(), '.github/workflows');
    const workflows = readdirSync(workflowDirectory)
      .filter((name) => /\.ya?ml$/.test(name))
      .map((name) => readFileSync(resolve(workflowDirectory, name), 'utf8'));
    let actionCount = 0;

    for (const workflow of workflows) {
      const externalActions = [
        ...workflow.matchAll(/^\s*-\s+uses:\s+([^./\s][^@\s]*)@([^\s#]+)/gm),
      ];
      actionCount += externalActions.length;
      for (const [, action, reference] of externalActions) {
        expect(reference, `${action} must use a full commit SHA`).toMatch(
          /^[a-f0-9]{40}$/,
        );
      }
    }
    expect(actionCount).toBeGreaterThan(0);
  });

  it('owns the formatter contract and generated ignores', () => {
    const config = JSON.parse(
      readFileSync(resolve(process.cwd(), '.oxfmtrc.json'), 'utf8'),
    ) as {
      ignorePatterns?: string[];
      printWidth?: number;
      singleQuote?: boolean;
      sortImports?: {
        customGroups?: Array<{ elementNamePattern?: string[] }>;
        newlinesBetween?: boolean;
      };
    };
    const packageJson = JSON.parse(
      readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'),
    ) as { scripts?: Record<string, string> };

    expect(config.printWidth).toBe(80);
    expect(config.singleQuote).toBe(true);
    expect(config.sortImports?.newlinesBetween).toBe(true);
    expect(
      config.sortImports?.customGroups?.flatMap(
        ({ elementNamePattern }) => elementNamePattern ?? [],
      ),
    ).toContain('#/**');
    expect(config.ignorePatterns).toEqual(
      expect.arrayContaining(['src/routeTree.gen.ts', 'src/theme/resolved.ts']),
    );
    expect(packageJson.scripts?.check).toBe(
      'vp fmt -c .oxfmtrc.json --check && vp check --no-fmt',
    );
  });
  it('never re-verifies emitted taxonomy slugs — the API guarantees they resolve (ADR-0099)', () => {
    // The per-slug resolve fan-out this guards against once cost a real board
    // 297 API round trips and ~15s of TTFB per /jobs render. Card/chip slugs
    // come from the jobs list/detail responses, whose contract guarantees
    // every emitted slug resolves — so no loader may re-check them. The
    // legitimate taxonomy resolvers (one resolve per LANDING page, e.g.
    // /jobs/:keyword) take a single slug; what this pins is the absence of
    // per-item resolution primitives.
    const sourceDirectory = resolve(process.cwd(), 'src');
    const banned = [
      'resolveTaxonomyChips',
      'filterRelatedSearches',
      'resolveCardTaxonomy',
      'collectCardTaxonomyCandidates',
    ];
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = resolve(dir, entry.name);
        if (entry.isDirectory()) {
          walk(path);
          continue;
        }
        if (!/\.(ts|tsx)$/.test(entry.name)) continue;
        if (entry.name === 'ci-quality-gate.test.ts') continue;
        const content = readFileSync(path, 'utf8');
        for (const name of banned) {
          if (content.includes(name)) offenders.push(`${path}: ${name}`);
        }
      }
    };
    walk(sourceDirectory);
    expect(offenders).toEqual([]);
  });
});
