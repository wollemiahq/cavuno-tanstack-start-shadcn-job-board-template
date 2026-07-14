import type { ReactNode } from 'react';

import { RheaAuthCard } from '@/components/rhea-auth-pilot';
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
    <RheaAuthCard title={title} supportingText={supportingText}>
      {children}
    </RheaAuthCard>
  );
}

export function Field({
  label,
  name,
  type = 'text',
  autoComplete,
  minLength,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  minLength?: number;
}) {
  return (
    <FormField>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
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
