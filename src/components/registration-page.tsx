import { useState } from 'react';

import { BriefcaseBusiness } from 'lucide-react';

import { m } from '../paraglide/messages';

import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Field as FormField,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldTitle,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

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

type RegistrationCopy = {
  nameLabel: string;
  emailLabel: string;
  passwordLabel: string;
  submitLabel: string;
  pendingLabel: string;
  successTitle: string;
  successText: string;
  successActionLabel: string;
};

type RegistrationResult = { ok: true } | { ok: false; message: string };

/**
 * Copy for the optional marketing checkbox. The disclosure is THIS app's
 * wording (see `marketingConsent_*` in `messages/*.json`) — the API records
 * the decision, never the prose. When omitted, no checkbox renders and no
 * consent can be recorded; unticked submits `marketingConsent: false`, which
 * records nothing server-side.
 */
export type MarketingConsentCopy = {
  disclosure: string;
  privacyPolicyUrl?: string;
  privacyLinkLabel?: string;
};

type RegistrationStatus =
  | { state: 'idle' }
  | { state: 'pending' }
  | { state: 'error'; message: string }
  | { state: 'success' };

export function RegistrationPage({
  title,
  supportingText,
  copy,
  successHref,
  onSubmit,
  footer,
  marketingConsent,
}: {
  title: string;
  supportingText: React.ReactNode;
  copy: RegistrationCopy;
  successHref: string;
  onSubmit: (values: {
    displayName: string;
    email: string;
    password: string;
    marketingConsent?: boolean;
  }) => Promise<RegistrationResult>;
  footer?: React.ReactNode;
  marketingConsent?: MarketingConsentCopy;
}) {
  const [status, setStatus] = useState<RegistrationStatus>({ state: 'idle' });
  const succeeded = status.state === 'success';

  return (
    <AuthPageCard
      title={succeeded ? copy.successTitle : title}
      supportingText={succeeded ? copy.successText : supportingText}
      announceTitle={succeeded}
    >
      {succeeded ? (
        <a
          href={successHref}
          className={cn(buttonVariants({ size: 'lg' }), 'w-full')}
        >
          {copy.successActionLabel}
        </a>
      ) : (
        <>
          <RegistrationForm
            copy={copy}
            status={status}
            onSubmit={onSubmit}
            onStatusChange={setStatus}
            marketingConsent={marketingConsent}
          />
          {footer}
        </>
      )}
    </AuthPageCard>
  );
}

function RegistrationForm({
  copy,
  status,
  onSubmit,
  onStatusChange,
  marketingConsent,
}: {
  copy: RegistrationCopy;
  status: RegistrationStatus;
  onSubmit: (values: {
    displayName: string;
    email: string;
    password: string;
    marketingConsent?: boolean;
  }) => Promise<RegistrationResult>;
  onStatusChange: (status: RegistrationStatus) => void;
  marketingConsent?: MarketingConsentCopy;
}) {
  const pending = status.state === 'pending';
  const [consentChecked, setConsentChecked] = useState(false);

  return (
    <form
      className="grid gap-4"
      onSubmit={async (event) => {
        event.preventDefault();
        onStatusChange({ state: 'pending' });
        const form = new FormData(event.currentTarget);
        try {
          const result = await onSubmit({
            displayName: String(form.get('displayName')),
            email: String(form.get('email')),
            password: String(form.get('password')),
            // Only a rendered, affirmatively ticked checkbox sends the flag.
            ...(marketingConsent ? { marketingConsent: consentChecked } : {}),
          });
          onStatusChange(
            result.ok
              ? { state: 'success' }
              : { state: 'error', message: result.message },
          );
        } catch {
          onStatusChange({
            state: 'error',
            message: m.candidateAction_errorText(),
          });
        }
      }}
    >
      <RegistrationField
        label={copy.nameLabel}
        name="displayName"
        autoComplete="name"
      />
      <RegistrationField
        label={copy.emailLabel}
        name="email"
        type="email"
        autoComplete="email"
      />
      <RegistrationField
        label={copy.passwordLabel}
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={8}
      />
      {marketingConsent ? (
        <FieldLabel
          htmlFor="marketing-consent"
          className="flex cursor-pointer items-start gap-3 font-normal"
        >
          <Checkbox
            id="marketing-consent"
            className="mt-0.5 shrink-0"
            checked={consentChecked}
            onCheckedChange={(checked) => setConsentChecked(checked === true)}
            data-test="sign-up-marketing-consent"
          />
          <span className="text-muted-foreground text-sm leading-snug">
            {marketingConsent.disclosure}
            {marketingConsent.privacyPolicyUrl ? (
              <>
                {' '}
                <a
                  href={marketingConsent.privacyPolicyUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-foreground underline"
                  onClick={(event) => event.stopPropagation()}
                >
                  {marketingConsent.privacyLinkLabel}
                </a>
              </>
            ) : null}
          </span>
        </FieldLabel>
      ) : null}
      {status.state === 'error' ? (
        <FieldError>{status.message}</FieldError>
      ) : null}
      <Button
        type="submit"
        size="lg"
        className="w-full data-disabled:pointer-events-none data-disabled:opacity-50"
        disabled={pending}
        focusableWhenDisabled
      >
        {pending ? copy.pendingLabel : copy.submitLabel}
      </Button>
    </form>
  );
}

function RegistrationField({
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
