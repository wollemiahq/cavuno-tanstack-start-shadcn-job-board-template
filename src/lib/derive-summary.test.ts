import { describe, expect, it } from 'vitest'

import { deriveSummary } from './derive-summary'

describe('deriveSummary', () => {
  it('returns the first real sentence, stripped of markup', () => {
    expect(
      deriveSummary(
        '<p>We build surgical robots that people trust.</p><p>More text.</p>',
      ),
    ).toBe('We build surgical robots that people trust.')
  })

  it('pads tag boundaries so stripped blocks do not fuse (S7)', () => {
    const out = deriveSummary(
      '<h2>Overview</h2><p>We are hiring a controls engineer for the arm team and beyond.</p>',
    )
    expect(out).toContain('Overview We are hiring')
  })

  it('suppresses unrendered ATS template tokens (S8)', () => {
    expect(
      deriveSummary('<p>Requisition ID: [[id]] Location: [[loc]]</p>'),
    ).toBeNull()
  })

  it('omits the line when there is no description', () => {
    expect(deriveSummary(null)).toBeNull()
    expect(deriveSummary('  ')).toBeNull()
  })

  it('truncates sentence-less text at a word boundary', () => {
    const out = deriveSummary(`<p>${'word '.repeat(60)}</p>`)
    expect(out!.length).toBeLessThanOrEqual(160)
    expect(out!.endsWith('…')).toBe(true)
  })
})
