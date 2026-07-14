import { describe, expect, it } from 'vitest';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('CAV-512 private-delivery documentation', () => {
  it('describes the starter truthfully while the repository remains private', () => {
    const readme = read('README.md');

    expect(readme).toContain('currently a private preview');
    expect(readme).toContain('wollemiahq/cavuno-shadcn-ui-job-board-template');
    expect(readme).not.toMatch(/^An open-source/m);
    expect(readme).not.toContain('cavuno-job-board-template-untitled-ui');
  });

  it('records a private gate without authorizing publish or deployment', () => {
    const gate = read('docs/publish-gate.md');
    const evidence = read('docs/release-evidence/README.md');

    expect(gate).toContain('# Private delivery gate — CAV-512');
    expect(gate).toContain('Repository visibility: **PRIVATE**');
    expect(gate).toContain('Doctor: **not yet accepted**');
    expect(gate).toContain('No push, deploy, public visibility change');
    expect(gate).toContain('shadcn add --all --dry-run --yes');
    expect(gate).not.toContain('cavuno-job-board-template-untitled-ui');
    expect(gate).not.toContain('--add-topic untitled-ui');
    expect(gate).not.toContain('Make the repo public');
    expect(evidence).toContain('Board doctor still has two skipped suites');
    expect(evidence).not.toContain(
      'Board doctor still has three skipped suites',
    );
  });

  it('accounts for current changes without rewriting historical provenance', () => {
    const provenance = read('docs/source-provenance.md');

    expect(provenance).toContain('## Current release reconciliation');
    for (const classification of [
      'Presentation',
      'Required search orchestration',
      'Repository identity',
      'Explicitly approved change',
    ]) {
      expect(provenance).toContain(classification);
    }
    expect(provenance).toContain('b3716b39c535a02af8d30326e085e1a5dada6ead');
  });

  it('carries useful package metadata without becoming publishable to npm', () => {
    const packageJson = JSON.parse(read('package.json')) as {
      description?: string;
      keywords?: string[];
      license?: string;
      private?: boolean;
      repository?: { type?: string; url?: string };
    };

    expect(packageJson.private).toBe(true);
    expect(packageJson.description).toMatch(/shadcn\/ui job board/i);
    expect(packageJson.license).toBe('MIT');
    expect(packageJson.repository).toEqual({
      type: 'git',
      url: 'https://github.com/wollemiahq/cavuno-shadcn-ui-job-board-template.git',
    });
    expect(packageJson.keywords).toEqual(
      expect.arrayContaining(['shadcn-ui', 'job-board', 'base-ui']),
    );
  });

  it('keeps unresolved release evidence explicit instead of overclaiming it', () => {
    const readme = read('README.md');
    const gate = read('docs/publish-gate.md');
    const evidence = read('docs/release-evidence/README.md');
    const provenance = read('docs/source-provenance.md');

    expect(readme).toContain('Home (company discovery + latest jobs)');
    expect(readme).toContain('Jobs search (filters + master/detail)');
    expect(gate).toContain('jobs no-results');
    expect(gate).toContain('populated left and right ad rails');
    expect(gate).toContain(
      'dark-mode coverage beyond the selected jobs surface',
    );
    expect(evidence).toContain(
      'Real-browser keyboard and visible-focus traversal',
    );
    expect(evidence).not.toContain('visible focus contracts are also covered');
    expect(provenance).toContain(
      'Exact file-and-behavior reconciliation against the source archive remains open',
    );
    expect(provenance).not.toContain(
      'The current tracked differences are accounted for',
    );
  });
});
