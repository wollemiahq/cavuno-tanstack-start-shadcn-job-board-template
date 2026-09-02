import { describe, expect, it } from 'vitest';

import { ogStyleValue, ogText, ogUrlAttr } from './og-text';

describe('ogText', () => {
  it('leaves & and quotes raw — HTMLRewriter does not decode entities', () => {
    expect(ogText('Perception & Autonomous "Systems"')).toBe(
      'Perception & Autonomous "Systems"',
    );
  });

  it('strips the only characters that can open or close a tag', () => {
    expect(ogText('<b>x</b> & y')).toBe('bx/b & y');
  });
});

describe('ogUrlAttr', () => {
  it('keeps query-string ampersands and encodes attribute breakers', () => {
    expect(ogUrlAttr('https://x.test/a.png?w=96&h=96"<>')).toBe(
      'https://x.test/a.png?w=96&h=96%22%3C%3E',
    );
  });
});

describe('ogStyleValue', () => {
  it('drops quotes, angle brackets and declaration separators', () => {
    expect(ogStyleValue('Inter";<x>')).toBe('Interx');
  });
});
