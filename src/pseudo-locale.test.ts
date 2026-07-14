import { describe, expect, it } from 'vitest';

import { pseudoLocalize } from '../scripts/pseudo-locale.mjs';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * en-XA pseudo-locale (Phase-1 coverage gate). Derived mechanically from
 * the en messages: letters get accented, the whole string is wrapped in
 * ⟦…⟧. A screenshot or curl of /en-XA/ makes un-tokenized copy instantly
 * visible — anything NOT bracketed did not come through Paraglide.
 */
describe('pseudoLocalize', () => {
  it('accents letters and wraps the string in ⟦…⟧', () => {
    const out = pseudoLocalize('Load more');
    expect(out.startsWith('⟦')).toBe(true);
    expect(out.endsWith('⟧')).toBe(true);
    expect(out).not.toContain('Load more'); // letters transformed
    expect(out.length).toBeGreaterThan('Load more'.length);
  });

  it('preserves ICU {param} and board {{token}} placeholders verbatim', () => {
    expect(pseudoLocalize('{years}+ years')).toContain('{years}');
    expect(pseudoLocalize('{years}+ years')).not.toContain('years}+ y');
    const tokens = pseudoLocalize('© {{year}} {{board_name}}. All rights.');
    expect(tokens).toContain('{{year}}');
    expect(tokens).toContain('{{board_name}}');
  });

  it('the committed messages/en-XA.json covers every en key, bracketed', () => {
    const root = join(import.meta.dirname, '..');
    const en = JSON.parse(
      readFileSync(join(root, 'messages/en.json'), 'utf8'),
    ) as Record<string, string>;
    const xa = JSON.parse(
      readFileSync(join(root, 'messages/en-XA.json'), 'utf8'),
    ) as Record<string, string>;
    for (const key of Object.keys(en)) {
      if (key.startsWith('$')) continue;
      expect(xa[key], `missing en-XA for ${key}`).toBeDefined();
      expect(xa[key]!.includes('⟦'), `${key} not pseudo-localized`).toBe(true);
      // Stale-derivation guard: regenerating from the current en must
      // reproduce the committed value (npm run gen:messages).
      expect(xa[key]).toBe(pseudoLocalize(en[key]!));
    }
  });
});
