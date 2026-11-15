import { describe, expect, it } from 'vitest';

import { withScrollableTables } from './scrollable-tables';

const OPEN = '<div class="typeset-scroll-fit" tabindex="0">';

describe('withScrollableTables', () => {
  it('returns html without tables unchanged', () => {
    const html = '<p>No table here.</p>';
    expect(withScrollableTables(html)).toBe(html);
  });

  it('wraps each table and leaves the content around it alone', () => {
    const html =
      '<p>a</p><table><tr><td>1</td></tr></table><p>b</p><TABLE class="x"><tr><td>2</td></tr></TABLE>';
    expect(withScrollableTables(html)).toBe(
      `<p>a</p>${OPEN}<table><tr><td>1</td></tr></table></div><p>b</p>${OPEN}<TABLE class="x"><tr><td>2</td></tr></TABLE></div>`,
    );
  });

  it('wraps a nested table once, at the outer table', () => {
    const html =
      '<table><tr><td><table><tr><td>in</td></tr></table></td></tr></table>';
    expect(withScrollableTables(html)).toBe(`${OPEN}${html}</div>`);
  });

  it('keeps the markup balanced when a table is never closed', () => {
    expect(withScrollableTables('<table><tr><td>1</td></tr>')).toBe(
      `${OPEN}<table><tr><td>1</td></tr></div>`,
    );
  });
});
