import { MENU_COLOR } from '#/starter-config';

import { describe, expect, it } from 'vitest';

import {
  isMenuInverted,
  isMenuTranslucent,
  menuColorClasses,
} from './menu-color';

describe('menu-color (builder starter-config contract)', () => {
  it('starter-config ships the default value', () => {
    expect(MENU_COLOR).toBe('default');
  });

  it('default → solid light header', () => {
    expect(menuColorClasses('default')).toEqual(['bg-background']);
    expect(isMenuInverted('default')).toBe(false);
    expect(isMenuTranslucent('default')).toBe(false);
  });

  it('inverted → dark class, solid background', () => {
    expect(menuColorClasses('inverted')).toEqual(['dark', 'bg-background']);
  });

  it('default-translucent → frosted, no dark', () => {
    expect(menuColorClasses('default-translucent')).toEqual([
      'bg-background/70 backdrop-blur-2xl backdrop-saturate-150',
    ]);
  });

  it('inverted-translucent → dark + frosted', () => {
    expect(menuColorClasses('inverted-translucent')).toEqual([
      'dark',
      'bg-background/70 backdrop-blur-2xl backdrop-saturate-150',
    ]);
  });
});
