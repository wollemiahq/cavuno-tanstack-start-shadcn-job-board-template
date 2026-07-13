// @vitest-environment jsdom
/**
 * AlertSignupForm dark-mode contrast invariant (CAV-492, ref CAV-486).
 *
 * The subscribe panel is rendered on a brand-tinted surface. The bare
 * `bg-brand-primary` token is theme-DIRECTIONAL: light → brand-50 (a pale
 * lavender that keeps the neutral `text-primary`/`text-tertiary` labels and
 * the brand bell legible), but dark → the SOLID brand-500 fill. On that
 * solid fill the neutral text tokens collapse (measured on the robotics
 * board: description ≈1.5:1, heading ≈2.6:1) and the brand bell icon becomes
 * the SAME colour as its background — invisible.
 *
 * The panel must therefore use the theme-ADAPTIVE `bg-brand-primary_alt`
 * token instead: identical brand-50 in light, but a neutral elevated surface
 * (bg-secondary) in dark, so the same neutral text + brand bell stay legible
 * while the brand border keeps the callout's identity. This test locks that
 * choice — it fails the moment the panel is reverted to the directional
 * `bg-brand-primary` fill that fails dark contrast.
 */
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { AlertSignupForm } from './alert-signup-form'

afterEach(cleanup)

function renderPanel() {
  const { container } = render(
    <AlertSignupForm
      language="en"
      onSubscribe={async () => ({ status: 'created' as const })}
    />,
  )
  const section = container.querySelector('section')
  if (!section) throw new Error('AlertSignupForm did not render a <section>')
  return section
}

describe('AlertSignupForm dark-mode contrast', () => {
  it('uses the theme-adaptive brand surface token, not the directional solid fill', () => {
    const section = renderPanel()
    // The adaptive token: pale in light, neutral-elevated (legible) in dark.
    expect(section.classList.contains('bg-brand-primary_alt')).toBe(true)
    // The directional token flips to a solid brand fill in dark that fails
    // contrast against the neutral text/bell — it must NOT be the surface.
    expect(section.classList.contains('bg-brand-primary')).toBe(false)
  })

  it('keeps the brand border so the callout still reads as branded', () => {
    const section = renderPanel()
    expect(section.classList.contains('border-brand')).toBe(true)
  })
})
