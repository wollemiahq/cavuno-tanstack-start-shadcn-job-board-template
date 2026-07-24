/**
 * Pseudo-locale derivations.
 *
 * `en-XA` — pseudo-ACCENT. Derives mechanically from en messages: every
 * letter is accented and the whole string is wrapped in ⟦…⟧, while ICU
 * `{param}` inputs and board `{{token}}` placeholders pass through
 * verbatim. On a /en-XA/ render, anything NOT bracketed did not come
 * through Paraglide — a hardcoded string, instantly visible in a
 * screenshot or curl.
 *
 * `ar-XB` — pseudo-BIDI, the conventional RTL sibling of en-XA (same
 * Android/CLDR pseudo-locale pair). Same accented, bracketed text so the
 * coverage property is identical, additionally wrapped in a
 * RIGHT-TO-LEFT ISOLATE (U+2067 … U+2069) so every message is genuinely
 * bidi-marked. Served under /ar-XB/ with `dir="rtl"`, it is how a
 * mirrored layout gets proven without shipping a real Arabic catalog.
 * Kept greppable on purpose: the runtime gate still substring-matches
 * the ⟦…⟧ text.
 *
 * Shared by scripts/gen-paraglide-messages.mjs (emit) and
 * src/pseudo-locale.test.ts (freshness gate).
 */

const ACCENTS = {
  a: 'á',
  b: 'ƀ',
  c: 'ç',
  d: 'ð',
  e: 'é',
  f: 'ƒ',
  g: 'ğ',
  h: 'ĥ',
  i: 'í',
  j: 'ĵ',
  k: 'ķ',
  l: 'ĺ',
  m: 'ɱ',
  n: 'ñ',
  o: 'ó',
  p: 'þ',
  q: 'ɋ',
  r: 'ŕ',
  s: 'š',
  t: 'ţ',
  u: 'ú',
  v: 'ṽ',
  w: 'ŵ',
  x: 'ẋ',
  y: 'ý',
  z: 'ž',
  A: 'Á',
  B: 'Ɓ',
  C: 'Ç',
  D: 'Ð',
  E: 'É',
  F: 'Ƒ',
  G: 'Ğ',
  H: 'Ĥ',
  I: 'Í',
  J: 'Ĵ',
  K: 'Ķ',
  L: 'Ĺ',
  M: 'Ṁ',
  N: 'Ñ',
  O: 'Ó',
  P: 'Þ',
  Q: 'Ɋ',
  R: 'Ŕ',
  S: 'Š',
  T: 'Ţ',
  U: 'Ú',
  V: 'Ṽ',
  W: 'Ŵ',
  X: 'Ẋ',
  Y: 'Ý',
  Z: 'Ž',
};

// {{board_token}} first (longer match), then ICU {param}.
const PLACEHOLDER = /\{\{[^}]+\}\}|\{[^}]+\}/g;

function accent(text) {
  return text.replace(/[A-Za-z]/g, (ch) => ACCENTS[ch] ?? ch);
}

export function pseudoLocalize(value) {
  let out = '';
  let last = 0;
  for (const match of value.matchAll(PLACEHOLDER)) {
    out += accent(value.slice(last, match.index));
    out += match[0]; // placeholder passes through verbatim
    last = match.index + match[0].length;
  }
  out += accent(value.slice(last));
  return `⟦${out}⟧`;
}

/** U+2067 RIGHT-TO-LEFT ISOLATE … U+2069 POP DIRECTIONAL ISOLATE. */
export const RLI = '⁧';
export const PDI = '⁩';

/**
 * ar-XB pseudo-bidi: the en-XA text inside an RTL isolate. Isolate (not
 * override) so embedded `{param}` values still render by their own
 * direction — the same thing a real Arabic string does to an English
 * job title.
 */
export function pseudoBidi(value) {
  return `${RLI}${pseudoLocalize(value)}${PDI}`;
}
