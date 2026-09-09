import { prepareImages } from '@takumi-rs/helpers';
import { extractEmojis } from '@takumi-rs/helpers/emoji';
import { fromHtml } from '@takumi-rs/helpers/html';
import { initSync, Renderer } from '@takumi-rs/wasm';
import wasm from '@takumi-rs/wasm/takumi_wasm_bg.wasm';

import { ogPngResponse } from './og-cache';
import { ogDirection } from './og-text';

import type { OgFont } from './og-font';

let initialized = false;

/** Render before sending headers, so font/image failures still become HTTP 503. */
export async function renderOgPng(
  html: string,
  font: OgFont,
): Promise<Response> {
  if (!initialized) {
    initSync({ module: wasm });
    initialized = true;
  }
  const renderer = new Renderer();
  try {
    const { node, css } = fromHtml(html);
    node.lang = font.language ?? 'en';
    node.dir = ogDirection(node.lang);
    const content = extractEmojis(node, 'twemoji');
    const images = await prepareImages({ node: content, timeout: 8000 });
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
