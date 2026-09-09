import { describe, expect, it } from 'vitest';

import { initialsOf } from './initials';

describe('initialsOf', () => {
  it('uses the first visible character of each of the first two words', () => {
    expect(initialsOf('TechNova Labs')).toBe('TL');
    expect(initialsOf('e\u0301cole numérique')).toBe('E\u0301N');
    expect(initialsOf('👩🏽‍💻 Studio')).toBe('👩🏽‍💻S');
    expect(initialsOf('東京 開発')).toBe('東開');
  });

  it('leaves an empty name without initials', () => {
    expect(initialsOf('   ')).toBeUndefined();
  });
});
