'use client';

import { ShaderMount, ditheringFragmentShader } from '@paper-design/shaders';
import { useEffect, useRef } from 'react';

import { cn } from '@/lib/utils';

/**
 * The decorative hero dithering band — the real paper.design Dithering
 * shader (https://shaders.paper.design/dithering), tuned for Stripe-landing
 * restraint: a faint, theme-coloured texture behind a headline, never a
 * poster. Content contrast always wins.
 *
 * Driven through paper's imperative `ShaderMount` (the framework-agnostic
 * core), not the React wrapper: the wrapper pulls in its own React copy under
 * this app's locked Vite dep-bundling and crashes with an invalid-hook-call,
 * and its string colour parser rejects our `oklch()`/transparent tokens. The
 * core takes numeric RGBA uniforms directly, so no colour string ever reaches
 * a parser, and there is no second React.
 *
 *  - Theme-driven: the `--foreground` token (reported as `oklch(…)`) is
 *    round-tripped to sRGB floats through a 2D canvas at mount and re-read on
 *    theme flips, so light/dark just work.
 *  - Kept faint via a low element opacity — the shader's own output is a
 *    hard two-colour field; the opacity is what makes it a texture.
 *  - Static under `prefers-reduced-motion`; a slow drift otherwise.
 *  - Client-only + WebGL2-guarded: the host `<div>`'s plain background is the
 *    graceful fallback on the server, in jsdom, or where WebGL2 is
 *    unavailable, and there is one WebGL context per band, disposed on unmount.
 *  - Decorative: `aria-hidden`, non-interactive.
 *
 * The public API is a single `className` (positioning/sizing owned by the
 * caller), unchanged from the previous canvas-2D implementation so every
 * consumer is a drop-in.
 */
export function DitherCanvas({ className }: { className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    // ShaderMount is WebGL2-only and throws where it is unavailable — probe on
    // a throwaway canvas first and bail to the host div's plain background.
    if (!document.createElement('canvas').getContext('webgl2')) return;

    // Resolve `--foreground` (the browser reports it as `oklch(…)`) to sRGB
    // 0..1 for the shader's numeric colour uniforms via a 1×1 2D canvas — no
    // colour string reaches the shader, so paper's parser is never involved.
    const swatch = document.createElement('canvas');
    swatch.width = swatch.height = 1;
    const ctx = swatch.getContext('2d', { willReadFrequently: true });
    const readInk = (): [number, number, number, number] => {
      const span = document.createElement('span');
      span.style.color = 'var(--foreground)';
      span.style.display = 'none';
      document.body.appendChild(span);
      const resolved = getComputedStyle(span).color || 'rgb(0, 0, 0)';
      span.remove();
      if (!ctx) return [0, 0, 0, 1];
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = '#000';
      try {
        ctx.fillStyle = resolved;
      } catch {
        /* keep the black fallback for exotic colour spaces */
      }
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      return [r / 255, g / 255, b / 255, 1];
    };

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const speedFor = () => (reduceMotion.matches ? 0 : 0.6);

    let mount: ShaderMount | undefined;
    try {
      mount = new ShaderMount(
        host,
        ditheringFragmentShader,
        {
          u_colorBack: [0, 0, 0, 0], // transparent — composite over the band bg
          u_colorFront: readInk(),
          u_shape: 1, // simplex noise
          u_type: 4, // 8×8 Bayer
          u_pxSize: 2,
          u_fit: 0, // none (pattern sizing)
          u_scale: 0.9,
          u_rotation: 0,
          u_offsetX: 0,
          u_offsetY: 0,
          u_originX: 0.5,
          u_originY: 0.5,
          u_worldWidth: 0,
          u_worldHeight: 0,
        },
        { alpha: true, premultipliedAlpha: false },
        speedFor(),
      );
    } catch {
      return; // WebGL init failed after the probe — leave the plain background
    }

    const applyInk = () => mount?.setUniforms({ u_colorFront: readInk() });
    const applySpeed = () => mount?.setSpeed(speedFor());
    reduceMotion.addEventListener('change', applySpeed);

    const themeObserver = new MutationObserver(applyInk);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    });

    return () => {
      reduceMotion.removeEventListener('change', applySpeed);
      themeObserver.disconnect();
      mount?.dispose();
    };
  }, []);

  return (
    <div
      ref={hostRef}
      aria-hidden
      className={cn('pointer-events-none opacity-[0.12]', className)}
    />
  );
}
