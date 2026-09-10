import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderOgPngWithRuntime } from './og-render-core';
import { ogText, ogUrlAttr } from './og-text';

import type { OgRenderRuntime, OgRenderer } from './og-render-core';

const render = vi.fn<OgRenderer['render']>();
const free = vi.fn<OgRenderer['free']>();
const images = vi.fn<OgRenderRuntime['prepareImages']>();
const runtime = {
  createRenderer: () => ({ render, free }),
  prepareImages: images,
} satisfies OgRenderRuntime;

const font = { name: 'Test', data: new ArrayBuffer(0), language: 'ar' };

beforeEach(() => {
  vi.clearAllMocks();
  images.mockResolvedValue([]);
  render.mockResolvedValue(new Uint8Array([137, 80, 78, 71]));
});

describe('Takumi OG response', () => {
  it('passes language, script fonts and image bytes to the renderer and releases it', async () => {
    const images = [
      { src: 'https://example.com/logo.png', data: new ArrayBuffer(4) },
    ];
    runtime.prepareImages.mockResolvedValue(images);
    const response = await renderOgPngWithRuntime(
      '<div>مهندس</div>',
      {
        ...font,
        fallbacks: [{ name: 'Arabic', data: new ArrayBuffer(2) }],
      },
      runtime,
    );
    const [node, options] = render.mock.calls[0];
    if (!options) throw new Error('renderer options missing');
    if (!Array.isArray(options.fonts))
      throw new Error('renderer fonts missing');
    expect(node.dir).toBe('rtl');
    expect(node.lang).toBe('ar');
    expect(options.images).toBe(images);
    expect(options.fonts).toEqual([
      expect.objectContaining({ name: 'Test' }),
      expect.objectContaining({ name: 'Arabic' }),
    ]);
    expect(response.headers.get('Content-Type')).toBe('image/png');
    expect(response.headers.get('Cache-Control')).not.toContain('immutable');
    expect(free).toHaveBeenCalledOnce();
  });

  it('parses escaped text and URL query strings exactly once', async () => {
    const text = '<script> &amp; "quoted"';
    const url = 'https://example.com/logo.png?w=80&h=80';
    await renderOgPngWithRuntime(
      `<div>${ogText(text)}<img src="${ogUrlAttr(url)}" /></div>`,
      font,
      runtime,
    );
    const tree = JSON.stringify(render.mock.calls[0][0]);
    expect(tree).toContain(JSON.stringify(text).slice(1, -1));
    expect(tree).toContain(url);
    expect(tree).not.toContain('"tagName":"script"');
  });

  it('prepares emoji image nodes before drawing', async () => {
    await renderOgPngWithRuntime('<div>Engineer 👩🏽‍💻</div>', font, runtime);
    const tree = JSON.stringify(images.mock.calls[0][0].node);
    expect(tree).toContain('1f469-1f3fd-200d-1f4bb.svg');
  });

  it('releases resources when rendering throws', async () => {
    render.mockRejectedValueOnce(new Error('font failure'));
    await expect(
      renderOgPngWithRuntime('<div>Job</div>', font, runtime),
    ).rejects.toThrow('font failure');
    expect(free).toHaveBeenCalledOnce();
  });

  it('rejects empty output and image failures before returning success headers', async () => {
    render.mockResolvedValueOnce(new Uint8Array(0));
    await expect(
      renderOgPngWithRuntime('<div>Job</div>', font, runtime),
    ).rejects.toThrow('empty image');
    images.mockRejectedValueOnce(new Error('image failure'));
    await expect(
      renderOgPngWithRuntime('<div>Job</div>', font, runtime),
    ).rejects.toThrow('image failure');
    expect(free).toHaveBeenCalledTimes(2);
  });
});
