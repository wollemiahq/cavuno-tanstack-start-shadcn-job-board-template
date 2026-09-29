import { describe, expect, it } from 'vitest';

import { isMenuInverted, isMenuTranslucent } from './menu-color';
describe('menu configuration interpretation', () => {
  it.each([
    ['default', false, false],
    ['inverted', true, false],
    ['default-translucent', false, true],
    ['inverted-translucent', true, true],
  ] as const)(
    '%s exposes inversion and translucency',
    (value, inverted, translucent) => {
      expect(isMenuInverted(value)).toBe(inverted);
      expect(isMenuTranslucent(value)).toBe(translucent);
    },
  );
});
