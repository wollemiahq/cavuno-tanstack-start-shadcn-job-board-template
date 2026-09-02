import { describe, expect, it } from 'vitest';

import { cn } from './utils';

describe('cn', () => {
  it('joins plain class strings', () => {
    expect(cn('px-2 py-1', 'bg-blue-500')).toBe('px-2 py-1 bg-blue-500');
  });

  it('resolves conflicting utilities to the last winner', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
    expect(cn('text-foreground', 'text-destructive')).toBe('text-destructive');
    expect(cn('text-base', 'text-2xl')).toBe('text-2xl');
  });

  it('skips falsy conditionals', () => {
    expect(cn('base', false && 'nope', true && 'yes')).toBe('base yes');
    expect(cn('a', null, undefined, '', 'b')).toBe('a b');
  });

  it('accepts object and array inputs', () => {
    expect(cn('base', { active: true, hidden: false })).toBe('base active');
    expect(cn(['a', 'b'], ['c'])).toBe('a b c');
  });
});
