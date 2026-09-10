import { prepareImages } from '@takumi-rs/helpers';
import { extractEmojis } from '@takumi-rs/helpers/emoji';
import { fromHtml } from '@takumi-rs/helpers/html';

import { ogPngResponse } from './og-cache';
import { ogDirection } from './og-text';

import type { OgFont } from './og-font';
import type { FetchedImage } from '@takumi-rs/helpers';
import type { Renderer } from '@takumi-rs/wasm';

export type OgRenderer = Pick<Renderer, 'free' | 'render'>;

type PrepareOgImages = typeof prepareImages<FetchedImage>;

export interface OgRenderRuntime {
  createRenderer(): OgRenderer;
  prepareImages: PrepareOgImages;
}

/** Render an OG card through an explicit runtime so the pipeline is testable without WASM. */
export async function renderOgPngWithRuntime(
  html: string,
  font: OgFont,
  runtime: OgRenderRuntime,
): Promise<Response> {
  const renderer = runtime.createRenderer();
  try {
    const { node, css } = fromHtml(html);
    node.lang = font.language ?? 'en';
    node.dir = ogDirection(node.lang);
    const content = extractEmojis(node, 'twemoji');
    const images = await runtime.prepareImages({
      node: content,
      timeout: 8000,
    });
    const png = await renderer.render(content, {
      images,
      width: 1200,
      height: 630,
      format: 'png',
      // Satori defaulted to border-box. Make that contract explicit in Takumi.
      css: ['* { box-sizing: border-box; }', ...css],
      fonts: [font, ...(font.fallbacks ?? [])].map(({ name, data }) => ({
        name,
        data,
        weight: 600,
        style: 'normal',
      })),
    });
    if (png.byteLength === 0)
      throw new Error('OG renderer produced an empty image');
    return ogPngResponse(png.buffer);
  } finally {
    // Each card has a different font subset; do not accumulate tenant fonts.
    renderer.free();
  }
}
