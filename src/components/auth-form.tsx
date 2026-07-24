import type { ReactNode } from 'react';

import { AuthPageCard } from '@/components/registration-page';
import {
  Field as FormField,
  FieldError,
  FieldLabel,
  FieldSeparator,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';

export function AuthCard({
  title,
  supportingText,
  children,
}: {
  title: string;
  supportingText?: ReactNode;
  children: ReactNode;
}) {
  return (
    <AuthPageCard title={title} supportingText={supportingText}>
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
