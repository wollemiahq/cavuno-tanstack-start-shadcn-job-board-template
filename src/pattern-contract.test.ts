import { describe, expect, it } from 'vitest';

import { parsePatternDoc } from '../scripts/gen-design-lib.mjs';

describe('design reference pattern parser', () => {
  it('reads generator metadata without prescribing prose or usage locations', () => {
    const pattern = parsePatternDoc(`---
name: Search panel
purpose: Find matching records.
primitives: [Input, Button]
---
An example that can be composed differently.

## Alternatives
Any useful guidance can go here.
`);
    expect(pattern).toEqual({
      name: 'Search panel',
      purpose: 'Find matching records.',
      primitives: ['Input', 'Button'],
      usedBy: [],
      sections: ['Alternatives'],
    });
  });

  it('reports missing frontmatter when generating a reference', () => {
    expect(() => parsePatternDoc('A document without metadata.')).toThrow(
      /frontmatter/,
    );
  });
});
