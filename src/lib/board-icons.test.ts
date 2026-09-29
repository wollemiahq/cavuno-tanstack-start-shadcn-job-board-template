import { describe, expect, it } from 'vitest';

import {
  boardHeadIconLinks,
  boardManifestIcons,
  type BoardBrandIcons,
} from './board-icons';

const fullPack: BoardBrandIcons = {
  ico: 'https://cdn.example/board.ico',
  svg: 'https://cdn.example/board.svg',
  appleTouch: 'https://cdn.example/apple.png',
  icon192: 'https://cdn.example/192.png',
  icon512: 'https://cdn.example/512.png',
  iconMaskable512: 'https://cdn.example/mask.png',
};

describe('boardHeadIconLinks', () => {
  it('emits only non-null board variants', () => {
    const links = boardHeadIconLinks({
      icons: {
        ...fullPack,
        svg: null,
        icon512: null,
      },
    });

    expect(links).toEqual([
      {
        rel: 'icon',
        type: 'image/x-icon',
        sizes: '32x32',
        href: fullPack.ico,
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '192x192',
        href: fullPack.icon192,
      },
      {
        rel: 'apple-touch-icon',
        type: 'image/png',
        sizes: '180x180',
        href: fullPack.appleTouch,
      },
    ]);
    expect(links.every((link) => link.href.startsWith('https://'))).toBe(true);
  });

  it('falls back to starter assets when icons are missing', () => {
    expect(boardHeadIconLinks(null)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rel: 'icon', href: expect.any(String) }),
      ]),
    );
    expect(boardHeadIconLinks({ icons: null }).length).toBeGreaterThan(0);
  });

  it('falls back when every variant is null (pack not generated yet)', () => {
    const links = boardHeadIconLinks({
      icons: {
        ico: null,
        svg: null,
        appleTouch: null,
        icon192: null,
        icon512: null,
        iconMaskable512: null,
      },
    });
    expect(links.some((l) => l.rel === 'icon' && l.href.length > 0)).toBe(true);
  });
});

describe('boardManifestIcons', () => {
  it('includes maskable 512 when present', () => {
    expect(boardManifestIcons({ icons: fullPack })).toEqual([
      { src: fullPack.icon192, sizes: '192x192', type: 'image/png' },
      { src: fullPack.icon512, sizes: '512x512', type: 'image/png' },
      {
        src: fullPack.iconMaskable512,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ]);
  });

  it('falls back to starter PNGs when the pack is empty', () => {
    const icons = boardManifestIcons({ icons: null });
    expect(icons.length).toBeGreaterThan(0);
    expect(
      icons.every(
        (icon) => icon.src.length > 0 && icon.type.startsWith('image/'),
      ),
    ).toBe(true);
  });
});
