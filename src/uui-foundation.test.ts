/**
 * Untitled UI foundation contract (CAV-480, the ADR-0072 "expand" step).
 *
 * The Untitled UI layer must coexist with the chassis without changing
 * how existing surfaces render, and must key off the SAME dark-mode
 * mechanism the BoardTheme script already owns. These are the load-bearing
 * reconciliations — if one regresses, dark mode silently splits into two
 * class vocabularies or the whole app flips to the Untitled UI font stack
 * mid-conversion.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

import { describe, expect, it } from 'vitest'

const root = join(import.meta.dirname, '..')
const read = (p: string) => readFileSync(join(root, p), 'utf8')

const tsFilesUnder = (dir: string): string[] => {
  const out: string[] = []
  const walk = (d: string) => {
    for (const entry of readdirSync(d)) {
      const full = join(d, entry)
      if (statSync(full).isDirectory()) walk(full)
      else if (/\.(ts|tsx)$/.test(entry) && !/\.test\./.test(entry))
        out.push(full)
    }
  }
  walk(join(root, dir))
  return out
}

describe('Untitled UI foundation CSS (manual-installation layer)', () => {
  it('imports the Untitled UI theme and typography layers into the one entry sheet', () => {
    const css = read('src/styles.css')
    expect(css).toContain(`@import "./styles/untitled-ui/theme.css"`)
    expect(css).toContain(`@import "./styles/untitled-ui/typography.css"`)
  })

  it('loads the react-aria and animate Tailwind plugins', () => {
    const css = read('src/styles.css')
    expect(css).toContain(`@plugin "tailwindcss-react-aria-components"`)
    expect(css).toContain(`@plugin "tailwindcss-animate"`)
  })

  it("keys dark mode to the BoardTheme script's .dark class — .dark-mode must not survive anywhere", () => {
    // themeModeScript toggles `dark` on <html>; upstream Untitled UI ships
    // `.dark-mode`. The adaptation is exactly one token — if `.dark-mode`
    // reappears (e.g. a future component paste), dark mode silently stops
    // applying to that code.
    for (const p of [
      'src/styles.css',
      'src/styles/untitled-ui/theme.css',
      'src/styles/untitled-ui/typography.css',
    ]) {
      expect(read(p), `${p} must not reference .dark-mode`).not.toContain(
        'dark-mode',
      )
    }
    // Exactly one dark variant definition, covering .dark itself AND its
    // descendants (superset of the old chassis variant), at the chassis's
    // original :is() specificity.
    const styles = read('src/styles.css')
    expect(styles.match(/@custom-variant dark /g)).toHaveLength(1)
    expect(styles).toContain('@custom-variant dark (&:is(.dark, .dark *))')
  })

  it('is STOCK Untitled UI: Inter loaded, no workshop design layer, no font aliasing', () => {
    // Amended 2026-07-10 (operator directive): the entry sheet follows
    // the manual installation exactly. Inter is the type stack (their
    // theme.css resolves `var(--font-inter, "Inter")` once the font is
    // loaded); the workshop fonts, palette, and signature treatments are
    // gone. If Bricolage or a --font-body alias reappears, the stock
    // claim is broken.
    const css = read('src/styles.css')
    expect(css).toContain('family=Inter')
    expect(css).not.toContain('Bricolage')
    expect(css).not.toContain('Source+Sans')
    expect(css).not.toMatch(/--font-body:\s*var\(--font-sans\)/)
    // Untitled UI components own ALL focus treatment — the chassis's
    // global :focus-visible outline (source of the double focus ring)
    // must not return.
    expect(css).not.toMatch(/^:focus-visible/m)
  })

  it('has DELETED the legacy compat block at the contract step (CAV-509)', () => {
    // The bridge is gone: no LEGACY COMPAT block, no shadcn `@theme inline`
    // aliases, no workshop signature classes. The whole app renders on the
    // stock Untitled UI token namespaces (--background-color-*, --text-color-*,
    // --border-color-*), so nothing needs the compat aliases anymore.
    const css = read('src/styles.css')
    expect(css).not.toContain('LEGACY COMPAT')
    expect(css).not.toContain('CAV-489')
    expect(css).not.toContain('prose-workshop')
    expect(css).not.toContain('bench-card')
    expect(css).not.toContain('--color-muted-foreground')
    expect(css).not.toContain('--color-foreground-subtle')
    expect(css).not.toContain('--font-heading')
  })

  it('the canonical UUI rich-text class (prose-uui) is defined on the prose var system', () => {
    // Directive 1: one repo-owned rich-text class layered on the stock
    // Untitled UI prose (the vendored typography.css), deviating only where
    // the brief mandates it — brand-colored links via the prose link var.
    const css = read('src/styles.css')
    expect(css).toContain('.prose-uui')
    expect(css).toMatch(/--tw-prose-links:\s*var\(--color-text-brand-secondary\)/)
  })

  it('no legacy shadcn class or variable name survives anywhere in src', () => {
    // The whole point of the bridge deletion: the frozen frontier is gone
    // from hand-authored source. Generated theme data (resolved.ts carries
    // a --font-heading token string for the BoardTheme runtime, unrelated to
    // the deleted Tailwind alias), paraglide, and the route tree are excluded.
    const LEGACY_NAMES = [
      'prose-workshop',
      'bench-card',
      'featured-tab',
      'count-brass',
      'bg-card',
      'text-foreground-subtle',
      'divide-border',
      'border-destructive',
      'bg-foreground',
      'text-background',
      'prose-neutral',
      'prose-invert',
    ]
    const SKIP = /\.test\.tsx?$|routeTree\.gen\.ts$|resolved\.ts$/
    const offenders: string[] = []
    for (const file of tsFilesUnder('src')) {
      if (SKIP.test(file)) continue
      const src = readFileSync(file, 'utf8')
      for (const name of LEGACY_NAMES) {
        if (src.includes(name)) offenders.push(`${relative(root, file)} — ${name}`)
      }
    }
    expect(offenders, `legacy names still present:\n${offenders.join('\n')}`).toEqual(
      [],
    )
  })
})

describe('class-merge utility (one seam, theirs)', () => {
  it('ships the Untitled UI cx/sortCx utility', () => {
    const cx = read('src/utils/cx.ts')
    expect(cx).toContain('extendTailwindMerge')
    expect(cx).toContain('export function sortCx')
  })

  it('new Untitled UI code paths never import the legacy cn helper', () => {
    for (const file of tsFilesUnder('src/components/base')) {
      const src = readFileSync(file, 'utf8')
      expect(src, `${file} must use @/utils/cx`).not.toMatch(
        /from ['"][@#]\/lib\/utils['"]/,
      )
    }
  })
})

describe('pilot wiring (the 404 page is a real page)', () => {
  it('the router mounts the not-found pilot as its default', () => {
    expect(read('src/router.tsx')).toContain('defaultNotFoundComponent')
  })
})
