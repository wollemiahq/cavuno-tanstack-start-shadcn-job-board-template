'use client';

import { useEffect, useRef } from 'react';

import { cn } from '@/lib/utils';

/**
 * A decorative, self-contained ordered-dithering field for the marketing
 * hero band — a paper.design-shaders feel (https://shaders.paper.design/)
 * without a dependency or WebGL. Canvas-2D, ~28k cells upscaled chunky, so
 * it stays cheap and works everywhere a 2D context does.
 *
 * Taste rules (Stripe-landing restraint):
 *  - VERY subtle: a faint texture behind the headline, never a poster.
 *    Content contrast wins; the band's own background reads through.
 *  - Theme-driven: the dot colour is read from the live `--foreground`
 *    token at mount and re-read on theme flips, so light/dark just work.
 *  - Motionless by default under `prefers-reduced-motion`; otherwise an
 *    almost-imperceptible slow drift (no layout shift, no reflow).
 *  - Decorative only: `aria-hidden`, not focusable, no semantics.
 *  - Degrades to nothing (transparent) when a 2D context is unavailable —
 *    the band's plain background is the fallback.
 */

// 8×8 Bayer matrix, normalised to (0,1) thresholds — the ordered-dither core.
const BAYER_8 = [
  0, 48, 12, 60, 3, 51, 15, 63, 32, 16, 44, 28, 35, 19, 47, 31, 8, 56, 4, 52,
  11, 59, 7, 55, 40, 24, 36, 20, 43, 27, 39, 23, 2, 50, 14, 62, 1, 49, 13, 61,
  34, 18, 46, 30, 33, 17, 45, 29, 10, 58, 6, 54, 9, 57, 5, 53, 42, 26, 38, 22,
  41, 25, 37, 21,
].map((v) => (v + 0.5) / 64);

/** CSS px per dither cell — bigger reads chunkier and costs fewer cells. */
const CELL = 4;
/** Peak fraction of cells lit (before the top-down falloff). Kept low. */
const MAX_COVERAGE = 0.55;

/** Resolve a CSS colour string to sRGB bytes via a 1×1 scratch context. */
function resolveRgb(
  probe: CanvasRenderingContext2D,
  color: string,
): [number, number, number] {
  probe.fillStyle = '#000';
  try {
    probe.fillStyle = color;
  } catch {
    // Unparseable value — fall through to the black default.
  }
  probe.clearRect(0, 0, 1, 1);
  probe.fillRect(0, 0, 1, 1);
  const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
  return [r, g, b];
}

export function DitherCanvas({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Any missing browser API (jsdom, ancient engines) ⇒ leave the canvas
    // transparent so the band's plain background is the graceful fallback.
    const get2d = (
      el: HTMLCanvasElement,
      opts?: CanvasRenderingContext2DSettings,
    ) => {
      try {
        return el.getContext('2d', opts);
      } catch {
        return null;
      }
    };
    const ctx = get2d(canvas);
    if (!ctx) return;

    // Cell-resolution buffer, upscaled chunky onto the visible canvas.
    const buffer = document.createElement('canvas');
    const bctx = get2d(buffer);
    const probe = get2d(document.createElement('canvas'), {
      willReadFrequently: true,
    });
    if (!bctx || !probe) return;

    const motionQuery =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;
    const reducedMotion = () => motionQuery?.matches ?? false;

    let cols = 0;
    let rows = 0;
    let fg: [number, number, number] = [0, 0, 0];
    let alpha = 0.05;
    let raf = 0;
    let start = 0;

    const readTheme = () => {
      const styles = getComputedStyle(canvas);
      fg = resolveRgb(probe, styles.color);
      // The dot colour is `currentColor`; the band sets `color` via the
      // foreground token. Dark bands swallow faint texture, so lift alpha.
      const dark = fg[0] + fg[1] + fg[2] > 383; // light-on-dark band
      alpha = dark ? 0.07 : 0.05;
    };

    const measure = () => {
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      cols = Math.max(1, Math.ceil(width / CELL));
      rows = Math.max(1, Math.ceil(height / CELL));
      canvas.width = width;
      canvas.height = height;
      buffer.width = cols;
      buffer.height = rows;
      ctx.imageSmoothingEnabled = false;
    };

    const render = (phase: number) => {
      const image = bctx.createImageData(cols, rows);
      const data = image.data;
      const [r, g, b] = fg;
      const a = Math.round(alpha * 255);
      for (let y = 0; y < rows; y++) {
        // Top-down falloff: texture sits behind the headline, gone by ~65%.
        const fall = Math.max(0, 1 - (y / rows) * 1.55);
        for (let x = 0; x < cols; x++) {
          // Gentle left-bias + a slow horizontal drift ripple.
          const drift = 0.05 * Math.sin(x * 0.18 + phase);
          const coverage =
            (fall * (1 - (x / cols) * 0.4) + drift) * MAX_COVERAGE;
          const threshold = BAYER_8[(x & 7) + (y & 7) * 8];
          if (coverage > threshold) {
            const i = (y * cols + x) * 4;
            data[i] = r;
            data[i + 1] = g;
            data[i + 2] = b;
            data[i + 3] = a;
          }
        }
      }
      bctx.putImageData(image, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(buffer, 0, 0, canvas.width, canvas.height);
    };

    const frame = (now: number) => {
      if (!start) start = now;
      // Very slow drift (~0.06 rad/s) — barely-there shimmer, not motion.
      render(((now - start) / 1000) * 0.06);
      raf = requestAnimationFrame(frame);
    };

    const startDrawing = () => {
      cancelAnimationFrame(raf);
      if (reducedMotion()) {
        render(0); // Reduced motion: a single static frame.
      } else {
        start = 0;
        raf = requestAnimationFrame(frame);
      }
    };

    const refresh = () => {
      readTheme();
      measure();
      startDrawing();
    };

    refresh();

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(refresh)
        : null;
    resizeObserver?.observe(canvas);
    // Theme flips toggle a class/attribute on <html>; re-read colours then.
    const themeObserver =
      typeof MutationObserver !== 'undefined'
        ? new MutationObserver(() => {
            readTheme();
            startDrawing();
          })
        : null;
    themeObserver?.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme', 'style'],
    });
    const onMotionChange = () => startDrawing();
    motionQuery?.addEventListener('change', onMotionChange);

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver?.disconnect();
      themeObserver?.disconnect();
      motionQuery?.removeEventListener('change', onMotionChange);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={cn('text-foreground', className)}
    />
  );
}
