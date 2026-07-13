// @vitest-environment jsdom
/**
 * LocationCombobox parity + legacy-free contract (CAV-489 contract step).
 *
 * The location field is the last bespoke legacy consumer converted in the
 * contract step. Its behaviour is load-bearing for the /jobs listing: a
 * debounced `places.list({ q })` typeahead whose selection writes the
 * `/jobs/locations/$location` URL. The conversion to Untitled UI primitives
 * must preserve that behaviour EXACTLY — same request shape, same 200ms
 * debounce, same min-query gate, same onSelect/onClear callbacks — while the
 * field is rebuilt on the Untitled UI icon set and the cx class-merge seam.
 * (The negative side — no legacy primitive-stack import survives — is enforced
 * by the CI structural gate, kept out of this file so the final-proof source
 * grep stays clean.)
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { cleanup, fireEvent, render, screen, act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const searchPlaces = vi.fn()
vi.mock('../server/queries', () => ({ searchPlaces: (...args: unknown[]) => searchPlaces(...args) }))

import { LocationCombobox, placeContextLabel } from './location-combobox'

const place = (over: Partial<{ id: string; name: string; slug: string | null; jobCount: number }>) => ({
  object: 'place' as const,
  id: over.id ?? 'p1',
  parentId: null,
  slug: over.slug === undefined ? 'london' : over.slug,
  name: over.name ?? 'London',
  placeType: 'city',
  countryCode: 'GB',
  regionCode: null,
  jobCount: over.jobCount ?? 42,
})

beforeEach(() => {
  vi.useFakeTimers()
  searchPlaces.mockReset()
  searchPlaces.mockResolvedValue({ data: [place({})] })
})

afterEach(() => {
  vi.runOnlyPendingTimers()
  vi.useRealTimers()
  cleanup()
})

const locationInput = () => screen.getByLabelText('location') as HTMLInputElement

const type = (value: string) => {
  const input = locationInput()
  fireEvent.change(input, { target: { value } })
  return input
}

describe('LocationCombobox — debounced request parity', () => {
  it('does not query below the 2-char minimum', async () => {
    render(<LocationCombobox onSelect={() => {}} onClear={() => {}} />)
    type('L')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500)
    })
    expect(searchPlaces).not.toHaveBeenCalled()
  })

  it('queries places.list with { q, limit: 10 } after a 200ms debounce', async () => {
    render(<LocationCombobox onSelect={() => {}} onClear={() => {}} />)
    type('Lon')
    // Before the debounce elapses, no request has gone out.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(150)
    })
    expect(searchPlaces).not.toHaveBeenCalled()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60)
    })
    expect(searchPlaces).toHaveBeenCalledTimes(1)
    expect(searchPlaces).toHaveBeenCalledWith({ data: { q: 'Lon', limit: 10 } })
  })

  it('renders each suggestion name with disambiguating country context and no job count', async () => {
    render(<LocationCombobox onSelect={() => {}} onClear={() => {}} />)
    type('Lon')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250)
    })
    expect(screen.getByText('London')).toBeTruthy()
    // The country disambiguates the many "London"s; the misleading unfiltered
    // job count (42) is gone.
    expect(screen.getByText(/United Kingdom/)).toBeTruthy()
    expect(screen.queryByText('42')).toBeNull()
  })

  it('drops suggestions with no slug (unlinkable places)', async () => {
    searchPlaces.mockResolvedValue({
      data: [place({ id: 'a', name: 'Linked', slug: 'linked' }), place({ id: 'b', name: 'Unlinked', slug: null })],
    })
    render(<LocationCombobox onSelect={() => {}} onClear={() => {}} />)
    type('Lin')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250)
    })
    expect(screen.getByText('Linked')).toBeTruthy()
    expect(screen.queryByText('Unlinked')).toBeNull()
  })
})

describe('LocationCombobox — selection and clear write the URL semantics', () => {
  it('selecting a suggestion calls onSelect with its slug and name', async () => {
    const onSelect = vi.fn()
    render(<LocationCombobox onSelect={onSelect} onClear={() => {}} />)
    type('Lon')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250)
    })
    fireEvent.mouseDown(screen.getByText('London'))
    expect(onSelect).toHaveBeenCalledWith({ slug: 'london', name: 'London' })
  })

  it('clearing calls onClear and empties the field', async () => {
    const onClear = vi.fn()
    render(<LocationCombobox value="berlin" valueLabel="Berlin" onSelect={() => {}} onClear={onClear} />)
    const clear = screen.getByLabelText('clear location')
    fireEvent.click(clear)
    expect(onClear).toHaveBeenCalledTimes(1)
    expect(locationInput().value).toBe('')
  })

  it('cold-loads the active slug label into the input', () => {
    render(<LocationCombobox value="berlin" valueLabel="Berlin" onSelect={() => {}} onClear={() => {}} />)
    expect(locationInput().value).toBe('Berlin')
  })
})

describe('placeContextLabel — disambiguation label builder', () => {
  it('resolves the country code to a human-readable name', () => {
    expect(placeContextLabel({ countryCode: 'GB' }, 'en')).toBe('United Kingdom')
    expect(placeContextLabel({ countryCode: 'CA' }, 'en')).toBe('Canada')
  })

  it('returns null when there is no country to show', () => {
    expect(placeContextLabel({ countryCode: null }, 'en')).toBeNull()
  })

  it('falls back to the raw code for a malformed country code (never throws)', () => {
    expect(placeContextLabel({ countryCode: 'XXX' }, 'en')).toBe('XXX')
  })
})

describe('LocationCombobox — Untitled UI foundation (contract step)', () => {
  const source = readFileSync(join(import.meta.dirname, 'location-combobox.tsx'), 'utf8')

  // Positive-only: the old field imported the legacy icon set and the cn
  // helper, so these two assertions were red before the conversion and green
  // after — without spelling the forbidden package names into src/ (which the
  // CAV-489 final-proof grep requires to be zero). The negative enforcement
  // (no legacy primitive-stack import anywhere) is the CI structural gate.
  it('is built on the Untitled UI icon set', () => {
    expect(source).toMatch(/from ['"]@untitledui\/icons['"]/)
  })

  it('merges classes through the cx seam', () => {
    expect(source).toMatch(/from ['"][@#]\/utils\/cx['"]/)
  })
})
