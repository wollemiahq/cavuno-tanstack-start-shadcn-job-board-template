/** Shared auth-page shell + field primitives. */
import { Briefcase01 } from '@untitledui/icons'

import { Input } from '@/components/base/input/input'
import { Text } from '@/components/text'

/**
 * Open, centered single-column auth shell — structured after Untitled UI's
 * log-in page examples (logo mark → display heading + supporting text →
 * form region). No card/ring wrapper: the auth surfaces sit on the bare
 * page ground.
 */
export function AuthCard({
  title,
  supportingText,
  children,
}: {
  title: string
  supportingText?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-8">
      <div className="flex flex-col items-center gap-6 text-center">
        <div
          aria-hidden
          className="flex size-12 items-center justify-center rounded-lg bg-primary text-fg-quaternary shadow-xs ring-1 ring-secondary"
        >
          <Briefcase01 className="size-6" />
        </div>
        <div className="flex flex-col gap-2">
          <Text as="h1" variant="heading2" className="md:text-display-sm">
            {title}
          </Text>
          {supportingText ? (
            <p className="text-md text-tertiary">{supportingText}</p>
          ) : null}
        </div>
      </div>
      <div className="flex w-full flex-col gap-5">{children}</div>
    </div>
  )
}

export function Field({
  label,
  name,
  type = 'text',
  autoComplete,
  minLength,
}: {
  label: string
  name: string
  type?: string
  autoComplete?: string
  minLength?: number
}) {
  return (
    <Input
      label={label}
      name={name}
      type={type}
      autoComplete={autoComplete}
      minLength={minLength}
      isRequired
      validationBehavior="native"
    />
  )
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return <p className="text-sm text-error-primary">{message}</p>
}

/**
 * Hairline "OR" divider — the Untitled UI login separator between the
 * primary email CTA and the social sign-in buttons.
 */
export function AuthDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px flex-1 bg-border-secondary" />
      <span className="text-sm text-tertiary">{label}</span>
      <span className="h-px flex-1 bg-border-secondary" />
    </div>
  )
}
