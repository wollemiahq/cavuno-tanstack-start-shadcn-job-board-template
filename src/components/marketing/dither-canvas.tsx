'use client';

import { Dithering } from '@paper-design/shaders-react';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

/**
 * The decorative hero dithering band — the real paper.design Dithering
 * shader (https://shaders.paper.design/dithering), tuned for Stripe-landing
 * restraint: a faint, theme-coloured texture behind a headline, never a
 * poster. Content contrast always wins.
 *
 *  - Theme-driven: the `--foreground` token (which the browser reports as
 *    `oklch(…)`, a format paper's colour parser rejects) is round-tripped to
 *    an `rgb()` string through a 1×1 2D canvas at mount and re-read on theme
 *    flips, so light/dark just work.
 *  - Kept faint via a low element opacity — the shader's own output is a
 *    hard two-colour field; the opacity is what makes it a texture.
 *  - Static under `prefers-reduced-motion`; a slow drift otherwise.
 *  - Client-only + WebGL2-guarded: the band's plain background is the
 *    graceful fallback on the server, in jsdom, or where WebGL2 is
 *    unavailable, so we never mount a shader that cannot draw.
 *  - Decorative: `aria-hidden`, non-interactive.
 *
 * The public API is a single `className` (positioning/sizing owned by the
 * caller), unchanged from the previous canvas-2D implementation so every
 * consumer is a drop-in.
 */
export function DitherCanvas({ className }: { className?: string }) {
  // `ink` doubles as the mount gate: null until the client has both a WebGL2
  // context and a resolved sRGB foreground colour.
  const [ink, setInk] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    // The shader needs WebGL2 — probe on a throwaway canvas and stay unmounted
    // where it is unavailable (SSR already skipped this effect).
    if (!document.createElement('canvas').getContext('webgl2')) return;

    // Resolve `--foreground` to an `rgb()` string paper can parse: paint the
    // computed colour into a 1×1 2D canvas and read the sRGB bytes back, so no
    // `oklch(…)` ever reaches the shader's colour parser.
    const swatch = document.createElement('canvas');
    swatch.width = swatch.height = 1;
    const ctx = swatch.getContext('2d', { willReadFrequently: true });
    const readInk = () => {
      const span = document.createElement('span');
      span.style.color = 'var(--foreground)';
      span.style.display = 'none';
      document.body.appendChild(span);
      const resolved = getComputedStyle(span).color || 'rgb(0, 0, 0)';
      span.remove();
      if (!ctx) {
        setInk(resolved);
        return;
      }
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = '#000';
      try {
        ctx.fillStyle = resolved;
      } catch {
        /* keep the black fallback for exotic colour spaces */
      }
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      setInk(`rgb(${r}, ${g}, ${b})`);
    };
    readInk();

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(motion.matches);
    const onMotion = () => setReducedMotion(motion.matches);
    motion.addEventListener('change', onMotion);

    const themeObserver = new MutationObserver(readInk);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    });

    return () => {
      motion.removeEventListener('change', onMotion);
      themeObserver.disconnect();
    };
  }, []);

  if (!ink) return null;

  return (
    <Dithering
      aria-hidden
      className={cn('pointer-events-none opacity-[0.12]', className)}
      colorBack="rgba(0, 0, 0, 0)" // transparent — composite over the band bg
      colorFront={ink}
      shape="simplex"
      type="8x8"
      size={2}
      scale={0.9}
      speed={reducedMotion ? 0 : 0.6}
    />
  );
}
