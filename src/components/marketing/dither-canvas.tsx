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
 *  - Theme-driven: the ink colour is read from the live `--foreground`
 *    token at mount and re-read on theme flips, so light/dark just work.
 *  - Kept faint via a low element opacity — the shader's own output is a
 *    hard two-colour field; the opacity is what makes it a texture.
 *  - Static under `prefers-reduced-motion`; a slow drift otherwise.
 *  - Client-only + WebGL-guarded: renders nothing on the server, in jsdom,
 *    or where WebGL is unavailable, so the band's plain background is the
 *    graceful fallback and there is one WebGL context per band, no more.
 *  - Decorative: `aria-hidden`, non-interactive.
 *
 * The public API is a single `className` (positioning/sizing owned by the
 * caller), unchanged from the previous canvas-2D implementation so every
 * consumer is a drop-in.
 */
export function DitherCanvas({ className }: { className?: string }) {
  // Gate the WebGL mount to the client where a context actually exists.
  const [ready, setReady] = useState(false);
  const [ink, setInk] = useState('#000000');
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const probeCanvas = document.createElement('canvas');
    const gl =
      probeCanvas.getContext('webgl2') ?? probeCanvas.getContext('webgl');
    if (!gl) return; // no WebGL (jsdom, ancient engines) — stay unmounted

    // Resolve the `--foreground` token to an `rgb()` string the shader can
    // parse — the browser reports the computed colour in its own space
    // (`oklch(…)`), which paper's colour parser rejects, so round-trip it
    // through a 2D context to sRGB bytes. Re-read on theme (dark) flips.
    const probe2d = probeCanvas.getContext('2d', { willReadFrequently: true });
    const readInk = () => {
      const span = document.createElement('span');
      span.style.color = 'var(--foreground)';
      span.style.display = 'none';
      document.body.appendChild(span);
      const resolved = getComputedStyle(span).color;
      span.remove();
      if (!probe2d) {
        if (resolved) setInk(resolved);
        return;
      }
      probe2d.clearRect(0, 0, 1, 1);
      probe2d.fillStyle = '#000';
      try {
        probe2d.fillStyle = resolved;
      } catch {
        /* keep the black fallback */
      }
      probe2d.fillRect(0, 0, 1, 1);
      const [r, g, b] = probe2d.getImageData(0, 0, 1, 1).data;
      setInk(`rgb(${r}, ${g}, ${b})`);
    };
    readInk();
    setReady(true);

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(motionQuery.matches);
    const onMotionChange = () => setReducedMotion(motionQuery.matches);
    motionQuery.addEventListener('change', onMotionChange);

    const themeObserver = new MutationObserver(readInk);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    });

    return () => {
      motionQuery.removeEventListener('change', onMotionChange);
      themeObserver.disconnect();
    };
  }, []);

  if (!ready) return null;

  return (
    <Dithering
      aria-hidden
      className={cn('pointer-events-none opacity-[0.12]', className)}
      colorBack="rgba(0, 0, 0, 0)"
      colorFront={ink}
      shape="simplex"
      type="8x8"
      size={2}
      scale={0.9}
      speed={reducedMotion ? 0 : 0.6}
    />
  );
}
