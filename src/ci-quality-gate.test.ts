import { describe, expect, it } from 'vitest';

import { readFileSync } from 'node:fs';
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
    const workflows = ['ci.yml', 'update.yaml'].map((name) =>
      readFileSync(resolve(process.cwd(), '.github/workflows', name), 'utf8'),
    );

    for (const workflow of workflows) {
      const externalActions = [
        ...workflow.matchAll(/^\s*-\s+uses:\s+([^./\s][^@\s]*)@([^\s#]+)/gm),
      ];
      expect(externalActions.length).toBeGreaterThan(0);
      for (const [, action, reference] of externalActions) {
        expect(reference, `${action} must use a full commit SHA`).toMatch(
          /^[a-f0-9]{40}$/,
        );
      }
    }
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
});
