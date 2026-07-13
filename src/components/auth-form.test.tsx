// @vitest-environment jsdom
/**
 * auth-form native-form parity (CAV-482 chassis conversion).
 *
 * The auth routes all submit by reading `new FormData(event.currentTarget)`
 * off a plain <form> — never controlled state. When `Field` moved from the
 * legacy Base UI input to the Untitled UI react-aria `Input`, that contract
 * had to survive byte-for-byte: the rendered element must still be a real
 * <input> that carries `name`, `type`, `autoComplete`, and a NATIVE
 * `required` attribute (so the browser blocks empty submits exactly as
 * before) and whose typed value is picked up by FormData. If react-aria's
 * validationBehavior regressed to aria-only, `required` would silently drop
 * off the DOM node and every auth form would submit empty payloads.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { AuthCard, Field, FormError } from './auth-form'

afterEach(cleanup)

describe('Field renders a native, form-participating input', () => {
  it('carries name/type/autoComplete and a native required attribute', () => {
    const { container } = render(
      <Field
        label="Email address"
        name="email"
        type="email"
        autoComplete="email"
      />,
    )
    const input = container.querySelector<HTMLInputElement>('input[name="email"]')
    expect(input).not.toBeNull()
    expect(input!.type).toBe('email')
    expect(input!.autocomplete).toBe('email')
    // The native `required` attribute — not merely aria-required — is what
    // makes the browser block an empty submit, matching the legacy input.
    expect(input!.hasAttribute('required')).toBe(true)
    // The visible label text is still rendered (accessible labelling).
    expect(screen.getByText('Email address')).toBeTruthy()
  })

  it('forwards minLength for the password rules', () => {
    const { container } = render(
      <Field label="Password" name="password" type="password" minLength={8} />,
    )
    const input = container.querySelector<HTMLInputElement>(
      'input[name="password"]',
    )
    expect(input!.minLength).toBe(8)
  })

  it('a plain form reads the typed value through FormData (submit contract)', () => {
    const seen: Record<string, string> = {}
    const { container } = render(
      <form
        onSubmit={(event) => {
          event.preventDefault()
          const data = new FormData(event.currentTarget)
          seen.email = String(data.get('email'))
        }}
      >
        <Field label="Email address" name="email" type="email" />
        <button type="submit">Submit</button>
      </form>,
    )
    const input = container.querySelector<HTMLInputElement>('input[name="email"]')!
    fireEvent.change(input, { target: { value: 'candidate@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))
    expect(seen.email).toBe('candidate@example.com')
  })
})

describe('AuthCard + FormError chrome', () => {
  it('renders the card title as a heading', () => {
    render(
      <AuthCard title="Sign in">
        <p>body</p>
      </AuthCard>,
    )
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeTruthy()
  })

  it('FormError shows a message only when one is present', () => {
    const { rerender, container } = render(<FormError message={null} />)
    expect(container.textContent).toBe('')
    rerender(<FormError message="Invalid credentials" />)
    expect(screen.getByText('Invalid credentials')).toBeTruthy()
  })
})
