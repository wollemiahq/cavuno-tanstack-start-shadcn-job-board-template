/**
 * uiCopy → Paraglide messages generator (ADR-0063 decision 2).
 *
 * The SDK's `uiCopy` catalog is the single source of truth for chrome
 * copy. This emits `messages/{locale}.json` (inlang message-format) from
 * it, so translations are never hand-authored in two places — regenerate
 * whenever @cavuno/board bumps. Nested groups flatten to `group_key`;
 * the two function-valued keys become parameterized ICU messages by
 * calling them with a sentinel and substituting the placeholder.
 *
 *   node scripts/gen-paraglide-messages.mjs
 */
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs'
import { uiCopy } from '@cavuno/board/format'

import { pseudoLocalize } from './pseudo-locale.mjs'

const LOCALES = ['en', 'de', 'fr']

// The two function-valued catalog keys → (param name, sentinel that
// round-trips through the formatter so we can recover the ICU template
// per locale). experienceYears takes a number; posted takes an
// already-formatted date string.
const PARAM_KEYS = {
  jobDetail_experienceYears: { name: 'years', sentinel: 987654 },
  jobDetail_posted: { name: 'date', sentinel: 'SENTINEL' },
}

function toIcuTemplate(flatKey, fn) {
  const spec = PARAM_KEYS[flatKey]
  if (!spec) throw new Error(`Unmapped function key: ${flatKey}`)
  const rendered = fn(spec.sentinel)
  return rendered.replace(String(spec.sentinel), `{${spec.name}}`)
}

function writeMessages(locale, messages) {
  mkdirSync('messages', { recursive: true })
  writeFileSync(
    `messages/${locale}.json`,
    JSON.stringify(messages, null, 2) + '\n',
  )
  console.log(
    `messages/${locale}.json — ${Object.keys(messages).length - 1} keys`,
  )
}

/**
 * STARTER-LOCAL keys survive regeneration: the catalog keys are
 * overwritten from uiCopy, every other key in the existing file (the
 * burned-down surface copy, grill 2026-07-04: starter-local, never
 * SDK-catalog extensions) is carried over verbatim.
 */
function existingMessages(locale) {
  try {
    return JSON.parse(readFileSync(`messages/${locale}.json`, 'utf8'))
  } catch {
    return {}
  }
}

let enMessages
for (const locale of LOCALES) {
  const catalog = uiCopy(locale)
  const messages = {
    $schema: 'https://inlang.com/schema/inlang-message-format',
  }
  const catalogKeys = new Set()
  for (const group of Object.keys(catalog)) {
    for (const key of Object.keys(catalog[group])) {
      const flatKey = `${group}_${key}`
      catalogKeys.add(flatKey)
      const value = catalog[group][key]
      // Board `{{token}}` templates (copyrightPrefix, defaultDescription):
      // Paraglide parses any `{…}` as an input, so `{{year}}` compiles to
      // a broken `"{year"` input + stray `}`. Emit them as real ICU inputs
      // (`{year}`); the copy seam feeds the tokens back in as values to
      // reconstruct the verbatim `{{token}}` template string per locale.
      messages[flatKey] =
        typeof value === 'function'
          ? toIcuTemplate(flatKey, value)
          : value.replace(/\{\{(\w+)\}\}/g, '{$1}')
    }
  }
  for (const [key, value] of Object.entries(existingMessages(locale))) {
    if (key.startsWith('$') || catalogKeys.has(key)) continue
    messages[key] = value
  }
  writeMessages(locale, messages)
  if (locale === 'en') enMessages = messages
}

// en-XA pseudo-locale — derived from whatever the CURRENT en source is
// (uiCopy today, builder-authored keys as they land), so the coverage
// gate survives the catalog→coded copy migration for free.
const pseudo = { $schema: enMessages.$schema }
for (const [key, value] of Object.entries(enMessages)) {
  if (key.startsWith('$')) continue
  pseudo[key] = pseudoLocalize(value)
}
writeMessages('en-XA', pseudo)
