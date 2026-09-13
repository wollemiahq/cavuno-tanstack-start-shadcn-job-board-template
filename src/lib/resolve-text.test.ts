import { describe, expect, it } from 'vitest';

import { resolveText } from './resolve-text';

describe('resolveText', () => {
  it('resolves current values on each call, including zero and spaced tokens', () => {
    for (const count of [303, 304, 0]) {
      expect(
        resolveText(
          'Browse {{ count }} jobs on {{board_name}}.',
          { count, board_name: 'Space' },
          'fallback',
        ),
      ).toBe(`Browse ${count} jobs on Space.`);
    }
  });
  it('falls back for the entire field when any value is unavailable', () => {
    for (const count of [null, undefined, '', '  ', NaN, Infinity]) {
      expect(
        resolveText(
          'Browse {{count}} jobs on {{board_name}}',
          { count, board_name: 'Space' },
          'Browse jobs',
        ),
      ).toBe('Browse jobs');
    }
    expect(resolveText('Jobs in {{location}}', {}, '')).toBe('');
    expect(
      resolveText('{{hitr}}', { board_name: 'EngineersWA' }, 'EngineersWA'),
    ).toBe('EngineersWA');
  });
  it('distinguishes intentionally empty text from missing overrides', () => {
    expect(resolveText('', {}, 'fallback')).toBe('');
    expect(resolveText(null, {}, 'fallback')).toBe('fallback');
    expect(resolveText(undefined, {}, 'fallback')).toBe('fallback');
    expect(resolveText(' Literal {braces} ', {}, 'fallback')).toBe(
      ' Literal {braces} ',
    );
  });
  it('does not read inherited keys, evaluate expressions or leave malformed tokens', () => {
    for (const template of [
      '{{toString}}',
      '{{constructor}}',
      '{{__proto__}}',
      '{{ count + 1 }}',
      '{{count',
      'count}}',
      '{{}}',
      '{{{count}}}',
    ]) {
      expect(resolveText(template, { count: 2 }, 'fallback')).toBe('fallback');
    }
  });
  it('returns text, treats replacement punctuation literally and never recurses', () => {
    const value = '<script>"$&"</script> \\';
    expect(resolveText('Hello {{name}}', { name: value }, 'fallback')).toBe(
      `Hello ${value}`,
    );
    expect(
      resolveText('{{name}}', { name: '{{count}}', count: 4 }, 'fallback'),
    ).toBe('fallback');
  });
});
