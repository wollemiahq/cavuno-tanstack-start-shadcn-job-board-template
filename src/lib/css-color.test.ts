import { describe, expect, it } from 'vitest';

import { oklabToSrgb, oklchToSrgb, toSatoriColor } from './css-color';

describe('oklchToSrgb', () => {
  it('maps the achromatic theme tokens onto the sRGB greys they encode', () => {
    expect(oklchToSrgb('oklch(1 0 0)')).toBe('#ffffff');
    expect(oklchToSrgb('oklch(0 0 0)')).toBe('#000000');
    // shadcn neutral scale: foreground / primary / muted-foreground / border.
    expect(oklchToSrgb('oklch(0.145 0 0)')).toBe('#0a0a0a');
    expect(oklchToSrgb('oklch(0.205 0 0)')).toBe('#171717');
    expect(oklchToSrgb('oklch(0.556 0 0)')).toBe('#737373');
    expect(oklchToSrgb('oklch(0.922 0 0)')).toBe('#e5e5e5');
  });

  it('handles chroma + hue, percentages and deg suffixes', () => {
    // sRGB red is oklch(0.628 0.2577 29.23).
    expect(oklchToSrgb('oklch(0.628 0.2577 29.23)')).toBe('#ff0000');
    expect(oklchToSrgb('oklch(62.8% 0.2577 29.23deg)')).toBe('#ff0000');
    // C as a percentage of 0.4.
    expect(oklchToSrgb('oklch(62.8% 64.425% 29.23)')).toBe('#ff0000');
  });

  it('keeps alpha as rgba() — a translucent border must not go opaque', () => {
    expect(oklchToSrgb('oklch(1 0 0 / 10%)')).toBe('rgba(255, 255, 255, 0.1)');
    expect(oklchToSrgb('oklch(0 0 0 / 0.5)')).toBe('rgba(0, 0, 0, 0.5)');
  });

  it('clamps out-of-gamut channels instead of emitting invalid hex', () => {
    expect(oklchToSrgb('oklch(0.9 0.4 145)')).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('returns null for anything that is not oklch()', () => {
    expect(oklchToSrgb('#fff')).toBeNull();
    expect(oklchToSrgb('rgb(1 2 3)')).toBeNull();
    expect(oklchToSrgb('oklab(0.5 0 0)')).toBeNull();
  });
});

describe('oklabToSrgb', () => {
  it('converts oklab()', () => {
    expect(oklabToSrgb('oklab(1 0 0)')).toBe('#ffffff');
    expect(oklabToSrgb('oklab(0.628 0.2249 0.1258)')).toBe('#ff0000');
  });
});

describe('toSatoriColor', () => {
  it('rewrites oklch/oklab and passes every other syntax through', () => {
    expect(toSatoriColor('oklch(1 0 0)')).toBe('#ffffff');
    expect(toSatoriColor('oklab(1 0 0)')).toBe('#ffffff');
    expect(toSatoriColor('#111827')).toBe('#111827');
    expect(toSatoriColor('hsl(0 0% 100%)')).toBe('hsl(0 0% 100%)');
    expect(toSatoriColor('transparent')).toBe('transparent');
  });
});
