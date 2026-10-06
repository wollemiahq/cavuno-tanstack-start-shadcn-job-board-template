import type { ReactNode } from 'react';

import { m } from '../paraglide/messages';

import { GoogleIcon, LinkedInIcon } from '@/components/brand-icons';
import { AuthPageCard } from '@/components/registration-page';
import { Button } from '@/components/ui/button';
import {
  Field as FormField,
  FieldError,
  FieldLabel,
  FieldSeparator,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

export function AuthCard({
  title,
  supportingText,
  mark,
  children,
}: {
  title: string;
  supportingText?: ReactNode;
  /** Replaces the default briefcase mark above the heading (decorative). */
  mark?: ReactNode;
  children: ReactNode;
}) {
  return (
    <AuthPageCard title={title} supportingText={supportingText} mark={mark}>
      {children}
    </AuthPageCard>
  );
}

export function Field({
  label,
  name,
  type = 'text',
  autoComplete,
  minLength,
  labelAction,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  minLength?: number;
  /** Trailing control on the label row (e.g. "Forgot password?"). */
  labelAction?: ReactNode;
}) {
  return (
    <FormField>
      {labelAction ? (
        <div className="flex items-center justify-between gap-2">
          <FieldLabel htmlFor={name}>{label}</FieldLabel>
          {labelAction}
        </div>
      ) : (
        <FieldLabel htmlFor={name}>{label}</FieldLabel>
      )}
      <Input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        minLength={minLength}
        required
      />
    </FormField>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return <FieldError>{message}</FieldError>;
}

export function AuthDivider({ label }: { label: string }) {
  return <FieldSeparator aria-hidden>{label}</FieldSeparator>;
}

export type SignInMethod = 'password' | 'magic';

const signInMethodTabClass =
  'has-focus-visible:ring-ring/30 flex h-9 cursor-pointer items-center justify-center rounded-xl px-3 text-sm font-medium transition-colors outline-none has-focus-visible:ring-3';

/** Password / magic-link switch shared by the sign-in surfaces. */
export function SignInMethodTabs({
  value,
  onValueChange,
  ariaLabel,
}: {
  value: SignInMethod;
  onValueChange: (value: SignInMethod) => void;
  ariaLabel: string;
}) {
  return (
    <RadioGroup
      name="sign-in-method"
      value={value}
      onValueChange={onValueChange}
      className="bg-muted grid grid-cols-2 gap-1 rounded-2xl p-1"
      aria-label={ariaLabel}
    >
      <label
        className={cn(
          signInMethodTabClass,
          value === 'password'
            ? 'bg-background text-foreground shadow-xs'
            : 'text-muted-foreground',
        )}
      >
        <RadioGroupItem value="password" className="sr-only" />
        {m.authSignIn_passwordTabLabel()}
      </label>
      <label
        className={cn(
          signInMethodTabClass,
          value === 'magic'
            ? 'bg-background text-foreground shadow-xs'
            : 'text-muted-foreground',
        )}
      >
        <RadioGroupItem value="magic" className="sr-only" />
        {m.authSignIn_magicLinkTabLabel()}
      </label>
    </RadioGroup>
  );
}

/** "Continue with Google / LinkedIn" pair shared by the sign-in surfaces. */
export function OAuthProviderButtons({
  disabled,
  onStart,
}: {
  disabled: boolean;
  onStart: (provider: 'google' | 'linkedin') => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full"
        disabled={disabled}
        onClick={() => onStart('google')}
      >
        <GoogleIcon />
        {m.authSignIn_continueWithGoogleLabel()}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full"
        disabled={disabled}
        onClick={() => onStart('linkedin')}
      >
        <LinkedInIcon className="size-4 text-[#0A66C2]" />
        {m.authSignIn_continueWithLinkedinLabel()}
      </Button>
    </div>
  );
}
