import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { boardCopy } from './copy'
import { baseLocale, overwriteGetLocale } from './paraglide/runtime'

describe('boardCopy is locale-driven (ADR-0063 D7 — the URL locale, not the board constant)', () => {
  afterEach(() => {
    overwriteGetLocale(() => baseLocale)
  })

  it('resolves the runtime locale even when callers pass the board language', () => {
    // Callers thread board.language (a board-level constant); under a
    // /de/ chrome locale the seam must follow the URL, or prefixed routes
    // would render the base language. baseLocale === board.language is a
    // generation-time invariant, so the param is redundant by design.
    overwriteGetLocale(() => 'de')
    expect(boardCopy('en').jobCard.featuredLabel).toBe('Hervorgehoben')
    overwriteGetLocale(() => baseLocale)
    expect(boardCopy('de').jobCard.featuredLabel).toBe('Featured')
  })

  it('keeps parameterized keys callable with their positional signature', () => {
    overwriteGetLocale(() => 'de')
    expect(boardCopy('en').jobDetail.experienceYears(5)).toBe('5+ Jahre')
    expect(boardCopy('en').jobDetail.posted('heute')).toBe(
      'Veröffentlicht heute',
    )
  })

  it('applies operator label overrides over the messages', () => {
    overwriteGetLocale(() => 'de')
    const copy = boardCopy('en', {
      jobCardLabels: { featuredLabel: 'Top Job' },
    })
    expect(copy.jobCard.featuredLabel).toBe('Top Job')
    // Empty/whitespace overrides never blank a label.
    expect(
      boardCopy('en', { jobCardLabels: { featuredLabel: '  ' } }).jobCard
        .featuredLabel,
    ).toBe('Hervorgehoben')
    // Overrides only apply to string keys — never clobber parameterized fns.
    expect(
      boardCopy('en', {
        jobCardLabels: { experienceYears: 'X' },
      }).jobDetail.experienceYears(2),
    ).toBe('2+ Jahre')
  })
})

describe('the copy seam is the only catalog call site (ADR-0061 D7)', () => {
  const SRC = join(import.meta.dirname)

  function walk(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const path = join(dir, name)
      if (statSync(path).isDirectory()) return walk(path)
      return /\.(ts|tsx)$/.test(name) ? [path] : []
    })
  }

  it('no file imports uiCopy except src/copy.ts', () => {
    const offenders = walk(SRC).filter((path) => {
      if (path === join(SRC, 'copy.ts')) return false
      const source = readFileSync(path, 'utf8')
      return /\buiCopy\b/.test(source) && /@cavuno\/board\/format/.test(source)
    })
    expect(offenders).toEqual([])
  })
})
