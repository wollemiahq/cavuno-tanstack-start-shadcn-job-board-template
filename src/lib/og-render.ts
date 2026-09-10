import { prepareImages } from '@takumi-rs/helpers';
import { initSync, Renderer } from '@takumi-rs/wasm';
import wasm from '@takumi-rs/wasm/takumi_wasm_bg.wasm';

import { renderOgPngWithRuntime } from './og-render-core';

import type { OgFont } from './og-font';

let initialized = false;

const runtime = {
  createRenderer: () => new Renderer(),
  prepareImages,
};

/** Render before sending headers, so font/image failures still become HTTP 503. */
export async function renderOgPng(
  html: string,
  font: OgFont,
): Promise<Response> {
  if (!initialized) {
    initSync({ module: wasm });
    initialized = true;
  }
  return renderOgPngWithRuntime(html, font, runtime);
}
