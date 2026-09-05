import { ImageResponse } from 'workers-og';

import { ogPngResponse } from './og-cache';

import type { OgFont } from './og-font';

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

/**
 * Render a 1200×630 PNG share card and hand back a fully materialised
 * Response.
 *
 * `workers-og`'s `ImageResponse` streams: it sends `200 image/png` first and
 * only THEN runs satori + resvg inside the stream's `start()`. A renderer
 * fault there cannot change the status any more — the client receives a
 * 200 with an EMPTY body, which social scrapers cache as a broken card and
 * nothing in our logs shows. Draining the stream here before responding
 * turns that into a thrown error the route maps to 503, and an empty
 * result is treated as a fault too.
 */
export async function renderOgPng(
  html: string,
  font: OgFont,
): Promise<Response> {
  const image = new ImageResponse(html, {
    width: OG_WIDTH,
    height: OG_HEIGHT,
    fonts: [{ name: font.name, data: font.data, weight: 600, style: 'normal' }],
  });
  const png = await image.arrayBuffer();
  if (png.byteLength === 0) {
    throw new Error('OG renderer produced an empty image');
  }
  return ogPngResponse(png);
}
