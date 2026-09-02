/**
 * CSS color → Satori-safe color.
 *
 * The theme tokens (src/theme.css → src/theme/resolved.ts) are `oklch(...)`,
 * which browsers accept but Satori (the OG card renderer under workers-og)
 * rejects with "Unexpected token type: function". Convert OKLCH / OKLab to
 * sRGB hex (or `rgba()` when the token carries alpha); pass every other
 * syntax through untouched.
 *
 * Pure math from CSS Color 4 §14.6 (OKLab ↔ linear sRGB); out-of-gamut
 * channels are clamped, which is the usual OG-card tolerance.
 */

const OKLCH_RE =
  /^oklch\(\s*([\d.]+%?)\s+([\d.]+%?)\s+([\d.]+)(?:deg)?\s*(?:\/\s*([\d.]+%?))?\s*\)$/i;
const OKLAB_RE =
  /^oklab\(\s*([\d.]+%?)\s+(-?[\d.]+%?)\s+(-?[\d.]+%?)\s*(?:\/\s*([\d.]+%?))?\s*\)$/i;

function percentOrNumber(raw: string, percentScale: number): number {
  return raw.endsWith('%')
    ? (Number.parseFloat(raw) / 100) * percentScale
    : Number.parseFloat(raw);
}

function alphaOf(raw: string | undefined): number {
  if (raw === undefined) return 1;
  const value = raw.endsWith('%')
    ? Number.parseFloat(raw) / 100
    : Number.parseFloat(raw);
  return Math.min(1, Math.max(0, value));
}

function oklabToLinearSrgb(L: number, a: number, b: number) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  return {
    r: 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    b: -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  };
}

function gamma(channel: number): number {
  const c = Math.min(1, Math.max(0, channel));
  const v = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
  return Math.round(v * 255);
}

function toCss(r: number, g: number, b: number, alpha: number): string {
  const R = gamma(r);
  const G = gamma(g);
  const B = gamma(b);
  if (alpha < 1) return `rgba(${R}, ${G}, ${B}, ${Number(alpha.toFixed(3))})`;
  const hex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${hex(R)}${hex(G)}${hex(B)}`;
}

/** `oklch(L C H [/ A])` → `#rrggbb` or `rgba(...)`; `null` when not OKLCH. */
export function oklchToSrgb(value: string): string | null {
  const match = OKLCH_RE.exec(value.trim());
  if (!match) return null;
  const L = percentOrNumber(match[1], 1);
  const C = percentOrNumber(match[2], 0.4);
  const H = (Number.parseFloat(match[3]) * Math.PI) / 180;
  const { r, g, b } = oklabToLinearSrgb(L, C * Math.cos(H), C * Math.sin(H));
  return toCss(r, g, b, alphaOf(match[4]));
}

/** `oklab(L a b [/ A])` → `#rrggbb` or `rgba(...)`; `null` when not OKLab. */
export function oklabToSrgb(value: string): string | null {
  const match = OKLAB_RE.exec(value.trim());
  if (!match) return null;
  const L = percentOrNumber(match[1], 1);
  const a = percentOrNumber(match[2], 0.4);
  const b = percentOrNumber(match[3], 0.4);
  const rgb = oklabToLinearSrgb(L, a, b);
  return toCss(rgb.r, rgb.g, rgb.b, alphaOf(match[4]));
}

/**
 * A color Satori can parse. OKLCH / OKLab become sRGB; hex, `rgb()`, `hsl()`
 * and named colors already work and pass through unchanged.
 */
export function toSatoriColor(value: string): string {
  return oklchToSrgb(value) ?? oklabToSrgb(value) ?? value;
}
