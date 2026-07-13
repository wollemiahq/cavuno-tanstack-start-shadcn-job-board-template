/**
 * en-XA pseudo-localization (Phase-1 coverage gate).
 *
 * Derives the en-XA locale mechanically from en messages: every letter is
 * accented and the whole string is wrapped in ⟦…⟧, while ICU `{param}`
 * inputs and board `{{token}}` placeholders pass through verbatim. On a
 * /en-XA/ render, anything NOT bracketed did not come through Paraglide —
 * a hardcoded string, instantly visible in a screenshot or curl.
 *
 * Shared by scripts/gen-paraglide-messages.mjs (emit) and
 * src/pseudo-locale.test.ts (freshness gate).
 */

const ACCENTS = {
  a: 'á', b: 'ƀ', c: 'ç', d: 'ð', e: 'é', f: 'ƒ', g: 'ğ', h: 'ĥ',
  i: 'í', j: 'ĵ', k: 'ķ', l: 'ĺ', m: 'ɱ', n: 'ñ', o: 'ó', p: 'þ',
  q: 'ɋ', r: 'ŕ', s: 'š', t: 'ţ', u: 'ú', v: 'ṽ', w: 'ŵ', x: 'ẋ',
  y: 'ý', z: 'ž',
  A: 'Á', B: 'Ɓ', C: 'Ç', D: 'Ð', E: 'É', F: 'Ƒ', G: 'Ğ', H: 'Ĥ',
  I: 'Í', J: 'Ĵ', K: 'Ķ', L: 'Ĺ', M: 'Ṁ', N: 'Ñ', O: 'Ó', P: 'Þ',
  Q: 'Ɋ', R: 'Ŕ', S: 'Š', T: 'Ţ', U: 'Ú', V: 'Ṽ', W: 'Ŵ', X: 'Ẋ',
  Y: 'Ý', Z: 'Ž',
}

// {{board_token}} first (longer match), then ICU {param}.
const PLACEHOLDER = /\{\{[^}]+\}\}|\{[^}]+\}/g

function accent(text) {
  return text.replace(/[A-Za-z]/g, (ch) => ACCENTS[ch] ?? ch)
}

export function pseudoLocalize(value) {
  let out = ''
  let last = 0
  for (const match of value.matchAll(PLACEHOLDER)) {
    out += accent(value.slice(last, match.index))
    out += match[0] // placeholder passes through verbatim
    last = match.index + match[0].length
  }
  out += accent(value.slice(last))
  return `⟦${out}⟧`
}
