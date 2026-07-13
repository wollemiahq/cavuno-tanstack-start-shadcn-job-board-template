import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  buildSyncPayload,
  parseTokens,
  tokensHash,
} from '../scripts/theme-resolved-lib.mjs'

/**
 * ADR-0065 D2/D3 — theme.css is canonical; everything else derives.
 * These tests pin the two derivations: the resolved-values module OG
 * consumes (Satori can't read CSS variables) and the platform snapshot
 * payload (email-safe subset, themeConfig key names — the fixed contract
 * boards/themeSnapshot:sync validates).
 */

const FIXTURE = `/*
 * mode: system
 * fontSans: geist
 * fontHeading: lora
 * fontsImport: https://fonts.googleapis.com/css2?family=Geist
 */
:root {
  --background: #FFFFFF;
  --foreground: #18181B;
  --primary: #27272A;
  --primary-foreground: #FDFDFD;
  --muted: #F4F4F5;
  --muted-foreground: #71717A;
  --border: #D4D4D8;
  --ring: #52525B;
}

.dark {
  --background: #18181B;
  --foreground: #FAFAFA;
}
`

describe('parseTokens', () => {
  it('extracts light/dark variable maps and banner metadata', () => {
    const parsed = parseTokens(FIXTURE)
    expect(parsed.light['--background']).toBe('#FFFFFF')
    expect(parsed.light['--ring']).toBe('#52525B')
    expect(parsed.dark['--background']).toBe('#18181B')
    expect(parsed.meta.mode).toBe('system')
    expect(parsed.meta.fontSans).toBe('geist')
    expect(parsed.meta.fontHeading).toBe('lora')
    expect(parsed.meta.fontsImport).toContain('fonts.googleapis.com')
  })

  it('derives a non-Geist Fontsource family from shadcn-style theme CSS', () => {
    const parsed = parseTokens(`
@import "@fontsource-variable/roboto-slab";
@theme inline {
  --font-heading: var(--font-sans);
  --font-sans: "Roboto Slab Variable", serif;
}
:root { --background: white; }
.dark { --background: black; }
`)

    expect(parsed.meta.fontSans).toBe('roboto-slab')
    expect(parsed.meta.fontHeading).toBe('inherit')
    expect(parsed.light['--font-sans']).toBe('"Roboto Slab Variable", serif')
  })
})

describe('tokensHash', () => {
  it('is a stable lowercase sha-256 of the file content', () => {
    expect(tokensHash(FIXTURE)).toMatch(/^[0-9a-f]{64}$/)
    expect(tokensHash(FIXTURE)).toBe(tokensHash(FIXTURE))
    expect(tokensHash(FIXTURE)).not.toBe(tokensHash(FIXTURE + ' '))
  })
})

describe('buildSyncPayload', () => {
  it('maps shadcn vars to the themeConfig-keyed email-safe subset', () => {
    const parsed = parseTokens(FIXTURE)
    const payload = buildSyncPayload(parsed, tokensHash(FIXTURE))
    expect(payload.colors).toEqual({
      buttonPrimary: '#27272A',
      buttonPrimaryText: '#FDFDFD',
      background: '#FFFFFF',
      mutedBackground: '#F4F4F5',
      border: '#D4D4D8',
      text: '#18181B',
      textMuted: '#71717A',
      brandColor: '#52525B',
    })
    expect(payload.fontSans).toBe('geist')
    expect(payload.fontHeading).toBe('lora')
    expect(payload.tokensHash).toMatch(/^[0-9a-f]{64}$/)
  })
})

describe('the committed resolved module matches the committed theme.css', () => {
  it('src/theme/resolved.ts carries the current tokens hash (npm run gen:theme)', async () => {
    const css = readFileSync(join(import.meta.dirname, 'theme.css'), 'utf8')
    const resolved = await import('./theme/resolved')
    expect(resolved.tokensHash).toBe(tokensHash(css))
    expect(resolved.themeTokens.light['--background']).toBeDefined()
  })
})
