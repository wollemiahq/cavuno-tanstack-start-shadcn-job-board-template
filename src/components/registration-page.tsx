import { useEffect, useState } from 'react';

import { Link } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { AuthDivider } from './auth-form';

import { AuthPageCard } from '@/components/auth-page-card';
import { GoogleIcon, LinkedInIcon } from '@/components/brand-icons';
import { SsoConnectionButtons } from '@/components/sso-connection-buttons';
import { Button, buttonVariants } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Field as FormField,
  FieldError,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { boardErrorMessage } from '@/lib/board-error-message';
import {
  isSsoOnly,
  resolveBoardSignIn,
  roleSignInOptions,
  signInOptionsForAvailable,
  type SignInOptions,
  type SsoChoice,
} from '@/lib/board-sign-in';
import { textActionClass } from '@/lib/text-link';
import { cn } from '@/lib/utils';
import type { AvailableSignInMethods, PublicBoardSignIn } from '@cavuno/board';

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

type RegistrationResult =
  | { ok: true }
  | {
      ok: false;
      code?: string;
      message: string;
      /** Present on `board_auth_method_unavailable`: what the role can use. */
      availableMethods?: AvailableSignInMethods;
    };
type RegistrationSubmitValues = {
  displayName: string;
  email: string;
  password: string;
  marketingConsent?: boolean;
};
type OAuthRegistrationResult =
  | { ok: true; authorizeUrl: string }
  | { ok: false; code?: string; message: string };

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
  | { state: 'error'; message: string; code?: string }
  | { state: 'success' };

export function RegistrationPage({
  title,
  supportingText,
  copy,
  successHref,
  onSubmit,
  footer,
  marketingConsent,
  onOAuthStart,
  role = 'candidate',
  signIn,
  onSsoStart,
}: {
  title: string;
  supportingText: React.ReactNode;
  copy: RegistrationCopy;
  successHref: string;
  onSubmit: (values: RegistrationSubmitValues) => Promise<RegistrationResult>;
  footer?: React.ReactNode;
  marketingConsent?: MarketingConsentCopy;
  onOAuthStart?: (
    provider: 'google' | 'linkedin',
  ) => Promise<OAuthRegistrationResult>;
  /** The role this page registers; picks `signIn.<role>`. */
  role?: 'candidate' | 'employer';
  /** `board.context().signIn`; absent means every built-in method, no SSO. */
  signIn?: PublicBoardSignIn;
  onSsoStart?: (choice: SsoChoice) => Promise<OAuthRegistrationResult>;
}) {
  const [status, setStatus] = useState<RegistrationStatus>({ state: 'idle' });
  const succeeded = status.state === 'success';
  const options = resolveBoardSignIn(signIn);
  /**
   * Set when registration answered `board_auth_method_unavailable`: the
   * methods and SSO connections the role has instead replace the page's own.
   */
  const [refused, setRefused] = useState<SignInOptions | null>(null);
  const offered = refused ?? roleSignInOptions(options, role);
  const { methods } = offered;
  const ssoChoices: SsoChoice[] = onSsoStart ? offered.ssoChoices : [];
  const showForm = methods.password && !refused;
  const oauthProviders = (['google', 'linkedin'] as const).filter(
    (provider) => onOAuthStart && methods[provider],
  );
  const showProviderButtons =
    ssoChoices.length > 0 || oauthProviders.length > 0;
  const pending = status.state === 'pending';

  useEffect(() => {
    if (status.state !== 'success') return;
    window.location.assign(successHref);
  }, [status.state, successHref]);

  return (
    <AuthPageCard
      title={succeeded ? copy.successTitle : title}
      supportingText={succeeded ? copy.successText : supportingText}
      announceTitle={succeeded}
    >
      {succeeded ? (
        <Link
          to={successHref}
          className={cn(buttonVariants({ size: 'lg' }), 'w-full')}
        >
          {copy.successActionLabel}
        </Link>
      ) : (
        <>
          {refused || isSsoOnly(offered) ? (
            <p className="text-muted-foreground text-center text-sm">
              {refused
                ? m.authSignInError_methodUnavailableText()
                : m.authSso_onlyText()}
            </p>
          ) : null}
          {showForm ? (
            <RegistrationForm
              copy={copy}
              status={status}
              onSubmit={async (values) => {
                const result = await onSubmit(values);
                if (!result.ok && result.availableMethods) {
                  setRefused(
                    signInOptionsForAvailable(
                      options,
                      role,
                      result.availableMethods,
                    ),
                  );
                }
                return result;
              }}
              onStatusChange={setStatus}
              marketingConsent={marketingConsent}
            />
          ) : null}
          {showForm && showProviderButtons ? (
            <AuthDivider label={m.authOrDividerLabel()} />
          ) : null}
          {showProviderButtons ? (
            <div className="flex flex-col gap-3">
              <SsoConnectionButtons
                choices={ssoChoices}
                disabled={pending}
                onSelect={(choice) => {
                  if (!onSsoStart) return;
                  void startProvider(() => onSsoStart(choice), setStatus);
                }}
              />
              {oauthProviders.map((provider) => (
                <OAuthButton
                  key={provider}
                  provider={provider}
                  pending={pending}
                  onStart={(value) => onOAuthStart!(value)}
                  onStatusChange={setStatus}
                />
              ))}
            </div>
          ) : null}
          {/* A refusal already swapped in the options that remain. */}
          {!showForm &&
          status.state === 'error' &&
          status.code !== 'board_auth_method_unavailable' ? (
            <FieldError>{status.message}</FieldError>
          ) : null}
          {!showForm && !showProviderButtons ? (
            <p className="text-muted-foreground text-center text-sm">
              {m.authSso_noMethodsText()}
            </p>
          ) : null}
          {refused ? (
            <button
              type="button"
              className={cn(textActionClass, 'justify-self-center text-sm')}
              onClick={() => {
                setRefused(null);
                setStatus({ state: 'idle' });
              }}
            >
              {m.authSso_signInAnotherWayLabel()}
            </button>
          ) : null}
          {footer}
        </>
      )}
    </AuthPageCard>
  );
}

function OAuthButton({
  provider,
  pending,
  onStart,
  onStatusChange,
}: {
  provider: 'google' | 'linkedin';
  pending: boolean;
  onStart: (
    provider: 'google' | 'linkedin',
  ) => Promise<OAuthRegistrationResult>;
  onStatusChange: (status: RegistrationStatus) => void;
}) {
  const label =
    provider === 'google'
      ? m.authSignIn_continueWithGoogleLabel()
      : m.authSignIn_continueWithLinkedinLabel();

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className="w-full"
      disabled={pending}
      onClick={() =>
        void startProvider(() => onStart(provider), onStatusChange)
      }
    >
      {provider === 'google' ? <GoogleIcon /> : <LinkedInIcon />}
      {label}
    </Button>
  );
}

/** Ask for a provider URL (Google, LinkedIn or SSO) and leave for it. */
async function startProvider(
  start: () => Promise<OAuthRegistrationResult>,
  onStatusChange: (status: RegistrationStatus) => void,
) {
  onStatusChange({ state: 'pending' });
  try {
    const result = await start();
    if (result.ok) {
      window.location.assign(result.authorizeUrl);
      return;
    }
    onStatusChange({ state: 'error', message: boardErrorMessage(result) });
  } catch {
    onStatusChange({ state: 'error', message: m.candidateAction_errorText() });
  }
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
  onSubmit: (values: RegistrationSubmitValues) => Promise<RegistrationResult>;
  onStatusChange: (status: RegistrationStatus) => void;
  marketingConsent?: MarketingConsentCopy;
}) {
  const pending = status.state === 'pending';
  const [consentChecked, setConsentChecked] = useState(false);

  return (
    <form
      method="post"
      className="grid gap-4"
      onSubmit={async (event) => {
        event.preventDefault();
        onStatusChange({ state: 'pending' });
        const form = new FormData(event.currentTarget);
        try {
          const values: RegistrationSubmitValues = {
            displayName: String(form.get('displayName')),
            email: String(form.get('email')),
            password: String(form.get('password')),
          };
          if (marketingConsent) {
            values.marketingConsent = consentChecked;
          }
          const result = await onSubmit(values);
          onStatusChange(
            result.ok
              ? { state: 'success' }
              : {
                  state: 'error',
                  message: boardErrorMessage(result),
                  code: result.code,
                },
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
