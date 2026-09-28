import { describe, expect, it } from 'vitest';

import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

describe('CI quality gate', () => {
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
});
