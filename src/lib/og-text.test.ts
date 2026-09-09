import { describe, expect, it } from 'vitest';

import {
  OG_META_SEPARATOR,
  ogDirection,
  ogTextDirection,
  ogGraphemes,
  truncateOgText,
  truncateOgTitle,
  ogStyleValue,
  ogSubsetText,
  ogText,
  ogUrlAttr,
} from './og-text';

describe('ogText', () => {
  it('escapes ampersands for the HTML parser', () => {
    expect(ogText('Perception & Autonomous "Systems"')).toBe(
      'Perception &amp; Autonomous "Systems"',
    );
  });

  it('keeps markup-like content as escaped visible text', () => {
    expect(ogText('<b>x</b> & y')).toBe('&lt;b&gt;x&lt;/b&gt; &amp; y');
  });
});

describe('ogUrlAttr', () => {
  it('escapes query strings and attribute delimiters', () => {
    expect(ogUrlAttr('https://x.test/a.png?w=96&h=96"<>')).toBe(
      'https://x.test/a.png?w=96&amp;h=96&quot;&lt;&gt;',
    );
  });
});

describe('ogStyleValue', () => {
  it('drops quotes, angle brackets and declaration separators', () => {
    expect(ogStyleValue('Inter";<x>')).toBe('Interx');
  });
});

describe('ogSubsetText', () => {
  it('includes the separator the card paints between meta parts', () => {
    const text = ogSubsetText(['Pilot', 'Acme', 'Berlin', '90–100']);
    // Omitted, Google Fonts ships no glyph for it and satori draws tofu.
    expect(text).toContain(OG_META_SEPARATOR);
  });

  it('drops empty parts and appends every extra glyph', () => {
    expect(ogSubsetText(['Pilot', '', null, undefined, 'Acme'])).toBe(
      `Pilot Acme ${OG_META_SEPARATOR}`,
    );
    expect(ogSubsetText(['Pilot'], [OG_META_SEPARATOR, '…'])).toBe(
      `Pilot ${OG_META_SEPARATOR} …`,
    );
  });
});

describe('Unicode character boundaries', () => {
  it('keeps combining accents, flags and joined emoji together', () => {
    expect(ogGraphemes('e\u0301🇦🇺👩🏽‍💻')).toEqual(['e\u0301', '🇦🇺', '👩🏽‍💻']);
    expect(truncateOgText('e\u0301👩🏽‍💻ABC', 3)).toBe('e\u0301👩🏽‍💻…');
    expect(truncateOgText('🇦🇺🇯🇵🇰🇷', 2)).toBe('🇦🇺…');
  });

  it('preserves scripts and handles zero and one character limits', () => {
    expect(truncateOgText('日本語の仕事', 4)).toBe('日本語…');
    expect(truncateOgText('مهندس', 20)).toBe('مهندس');
    expect(truncateOgText('abc', 0)).toBe('');
    expect(truncateOgText('abc', 1)).toBe('…');
  });
});

it('reserves room for full-width titles without cutting their characters', () => {
  expect(truncateOgTitle('日本語の仕事', 8)).toBe('日本語…');
  expect(truncateOgTitle('👩🏽‍💻👩🏽‍💻👩🏽‍💻', 5)).toBe('👩🏽‍💻👩🏽‍💻…');
  expect(truncateOgTitle('Senior engineer', 80)).toBe('Senior engineer');
});

describe('direction isolation', () => {
  it('uses board language for layout and each field for its own paragraph', () => {
    expect(ogDirection('ar-AE')).toBe('rtl');
    expect(ogDirection('he')).toBe('rtl');
    expect(ogDirection('en')).toBe('ltr');
    expect(ogTextDirection('€90–120K / year')).toBe('ltr');
    expect(ogTextDirection('مهندس React')).toBe('rtl');
    expect(ogTextDirection('Acme تقنية')).toBe('ltr');
    expect(ogTextDirection('2026 מפתח')).toBe('rtl');
  });
});
