import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderOgPng } from './og-render';
import { ogText, ogUrlAttr } from './og-text';

const renderer = vi.hoisted(() => ({
  render: vi.fn(),
  free: vi.fn(),
  images: vi.fn(),
}));

vi.mock('@takumi-rs/wasm/takumi_wasm_bg.wasm', () => ({ default: {} }));
vi.mock('@takumi-rs/wasm', () => ({
  initSync: vi.fn(),
  Renderer: class {
    render = renderer.render;
    free = renderer.free;
  },
}));
vi.mock('@takumi-rs/helpers', () => ({ prepareImages: renderer.images }));

const font = { name: 'Test', data: new ArrayBuffer(0), language: 'ar' };

beforeEach(() => {
  vi.clearAllMocks();
  renderer.images.mockResolvedValue([]);
  renderer.render.mockResolvedValue(new Uint8Array([137, 80, 78, 71]));
});

describe('Takumi OG response', () => {
  it('passes language, script fonts and image bytes to the renderer and releases it', async () => {
    const images = [
      { src: 'https://example.com/logo.png', data: new ArrayBuffer(4) },
    ];
    renderer.images.mockResolvedValue(images);
    const response = await renderOgPng('<div>مهندس</div>', {
      ...font,
      fallbacks: [{ name: 'Arabic', data: new ArrayBuffer(2) }],
    });
    const [node, options] = renderer.render.mock.calls[0];
    expect(node.dir).toBe('rtl');
    expect(node.lang).toBe('ar');
    expect(options.images).toBe(images);
    expect(options.fonts.map((entry: { name: string }) => entry.name)).toEqual([
      'Test',
      'Arabic',
    ]);
    expect(response.headers.get('Content-Type')).toBe('image/png');
    expect(response.headers.get('Cache-Control')).not.toContain('immutable');
    expect(renderer.free).toHaveBeenCalledOnce();
  });

  it('parses escaped text and URL query strings exactly once', async () => {
    const text = '<script> &amp; "quoted"';
    const url = 'https://example.com/logo.png?w=80&h=80';
    await renderOgPng(
      `<div>${ogText(text)}<img src="${ogUrlAttr(url)}" /></div>`,
      font,
    );
    const tree = JSON.stringify(renderer.render.mock.calls[0][0]);
    expect(tree).toContain(JSON.stringify(text).slice(1, -1));
    expect(tree).toContain(url);
    expect(tree).not.toContain('"tagName":"script"');
  });

  it('prepares emoji image nodes before drawing', async () => {
    await renderOgPng('<div>Engineer 👩🏽‍💻</div>', font);
    const tree = JSON.stringify(renderer.images.mock.calls[0][0].node);
    expect(tree).toContain('1f469-1f3fd-200d-1f4bb.svg');
  });

  it('releases resources when rendering throws', async () => {
    renderer.render.mockRejectedValueOnce(new Error('font failure'));
    await expect(renderOgPng('<div>Job</div>', font)).rejects.toThrow(
      'font failure',
    );
    expect(renderer.free).toHaveBeenCalledOnce();
  });

  it('rejects empty output and image failures before returning success headers', async () => {
    renderer.render.mockResolvedValueOnce(new Uint8Array(0));
    await expect(renderOgPng('<div>Job</div>', font)).rejects.toThrow(
      'empty image',
    );
    renderer.images.mockRejectedValueOnce(new Error('image failure'));
    await expect(renderOgPng('<div>Job</div>', font)).rejects.toThrow(
      'image failure',
    );
    expect(renderer.free).toHaveBeenCalledTimes(2);
  });
});
