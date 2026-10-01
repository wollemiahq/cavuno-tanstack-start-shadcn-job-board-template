import { BriefcaseBusiness } from 'lucide-react';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Field as FormField,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from '@/components/ui/field';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export function AuthPageCard({
  title,
  supportingText,
  announceTitle = false,
  children,
}: {
  title: string;
  supportingText?: React.ReactNode;
  announceTitle?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-md py-6 sm:py-12">
      <Card variant="elevated">
        {/* CardHeader is a grid, so `items-center` only aligns the cross axis
            (vertical) — `justify-items-center` is what centres the mark and
            heading horizontally. */}
        <CardHeader className="items-center justify-items-center gap-5 text-center">
          <div
            aria-hidden
            className="bg-primary text-primary-foreground flex size-11 items-center justify-center rounded-2xl shadow-sm"
          >
            <BriefcaseBusiness className="size-5" />
          </div>
          <div
            className="grid gap-2"
            role={announceTitle ? 'status' : undefined}
            aria-live={announceTitle ? 'polite' : undefined}
          >
            <h1 className="font-heading text-foreground text-2xl font-medium tracking-tight">
              {title}
            </h1>
            {supportingText ? (
              <p className="text-muted-foreground text-sm leading-6">
                {supportingText}
              </p>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="grid gap-5">{children}</CardContent>
      </Card>
    </div>
  );
}

export function RoleSelector({
  value,
  onValueChange,
  ariaLabel,
  candidateTitle,
  candidateBody,
  employerTitle,
  employerBody,
}: {
  value: 'candidate' | 'employer';
  onValueChange: (value: 'candidate' | 'employer') => void;
  ariaLabel: string;
  candidateTitle: string;
  candidateBody: string;
  employerTitle: string;
  employerBody: string;
}) {
  return (
    <RadioGroup
      value={value}
      onValueChange={onValueChange}
      aria-label={ariaLabel}
    >
      <RoleOption
        value="candidate"
        title={candidateTitle}
        body={candidateBody}
      />
      <RoleOption value="employer" title={employerTitle} body={employerBody} />
    </RadioGroup>
  );
}

function RoleOption({
  value,
  title,
  body,
}: {
  value: 'candidate' | 'employer';
  title: string;
  body: string;
}) {
  const id = `role-${value}`;

  return (
    <FieldLabel
      htmlFor={id}
      className="hover:bg-muted cursor-pointer transition-colors"
    >
      <FormField orientation="horizontal">
        <FieldContent>
          <FieldTitle>{title}</FieldTitle>
          <FieldDescription>{body}</FieldDescription>
        </FieldContent>
        <RadioGroupItem
          id={id}
          value={value}
          aria-label={`${title}. ${body}`}
        />
      </FormField>
    </FieldLabel>
  );
}
