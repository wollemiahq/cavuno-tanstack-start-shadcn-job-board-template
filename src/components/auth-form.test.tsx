// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'

import { useState } from 'react'

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
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    Link: ({
      to,
      children,
      ...props
    }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
  }
})

import {
  AuthCard,
  Field,
  FormError,
} from './auth-form'
import {
  RheaRegistrationPage,
  RoleSelector,
} from './rhea-auth-pilot'

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

describe('RheaRegistrationPage', () => {
  const copy = {
    nameLabel: 'Name',
    emailLabel: 'Email',
    passwordLabel: 'Password',
    submitLabel: 'Create account',
    pendingLabel: 'Creating account…',
    successTitle: 'Check your email',
    successText: 'Open the verification link to continue.',
    successActionLabel: 'Go to my account',
  }

  it('reports a registration error without losing the submitted values', async () => {
    render(
      <RheaRegistrationPage
        title="Create your account"
        supportingText="Join the board."
        copy={copy}
        successHref="/account"
        onSubmit={async () => ({ ok: false, message: 'Email is already registered' })}
      />,
    )

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Alex Morgan' },
    })
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'alex@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'correct-horse' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Email is already registered',
    )
    expect(screen.getByLabelText('Email')).toHaveValue('alex@example.com')
  })

  it('recovers when the registration request rejects unexpectedly', async () => {
    render(
      <RheaRegistrationPage
        title="Create your account"
        supportingText="Join the board."
        copy={copy}
        successHref="/account"
        onSubmit={async () => {
          throw new Error('network unavailable')
        }}
      />,
    )

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Alex Morgan' },
    })
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'alex@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'correct-horse' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Something went wrong. Try again.',
    )
    expect(screen.getByRole('button', { name: 'Create account' })).toBeEnabled()
  })

  it('replaces the initial heading with one announced success heading', async () => {
    render(
      <RheaRegistrationPage
        title="Create your account"
        supportingText="Join the board."
        copy={copy}
        successHref="/account"
        onSubmit={async () => ({ ok: true })}
      />,
    )

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Alex Morgan' },
    })
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'alex@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'correct-horse' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))

    const status = await screen.findByRole('status')
    expect(status).toHaveTextContent('Check your email')
    expect(screen.queryByRole('heading', { name: 'Create your account' })).toBeNull()
    expect(screen.getAllByRole('heading')).toHaveLength(1)
    expect(
      screen.getByRole('heading', { name: 'Check your email' }),
    ).toBeInTheDocument()
  })

  it('keeps the pending Base UI submit in the tab order', async () => {
    render(
      <RheaRegistrationPage
        title="Create your account"
        supportingText="Join the board."
        copy={copy}
        successHref="/account"
        onSubmit={() => new Promise(() => undefined)}
      />,
    )

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Alex Morgan' },
    })
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'alex@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'correct-horse' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))

    const pending = await screen.findByRole('button', {
      name: 'Creating account…',
    })
    expect(pending).toHaveAttribute('aria-disabled', 'true')
    expect(pending).not.toHaveAttribute('disabled')
    expect(pending).toHaveAttribute('tabindex', '0')
  })
})

describe('RoleSelector', () => {
  it('moves selection between the candidate and employer choices', () => {
    function Harness() {
      const [value, setValue] = useState<'candidate' | 'employer'>(
        'candidate',
      )
      return (
        <RoleSelector
          value={value}
          onValueChange={setValue}
          ariaLabel="How would you like to get started?"
          candidateTitle="I'm looking for a job"
          candidateBody="Get matched with jobs for free"
          employerTitle="I'm hiring"
          employerBody="Post jobs and reach candidates"
        />
      )
    }

    render(<Harness />)
    const candidate = screen.getByRole('radio', {
      name: /I'm looking for a job/,
    })
    const employer = screen.getByRole('radio', { name: /I'm hiring/ })

    expect(candidate).toBeChecked()
    expect(candidate).toHaveAttribute(
      'aria-label',
      "I'm looking for a job. Get matched with jobs for free",
    )
    expect(candidate.closest('label')).toBeNull()
    fireEvent.click(screen.getByText("I'm hiring"))
    expect(employer).toBeChecked()
  })
})
