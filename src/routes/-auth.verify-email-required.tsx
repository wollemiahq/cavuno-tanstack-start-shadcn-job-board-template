/**
 * Verification-required gate for authenticated starter routes.
 * The signed-in-but-unverified candidate either enters the 6-digit OTP from the
 * verification email (`board.auth.verifyEmailWithCode`) or opens the magic link
 * (which lands on `/auth/verify-email`). Resend re-sends both. A successful
 * verify offers one skippable resume-upload step (the onboarding parse
 * pipeline) before continuing to the validated destination.
 */
import { useEffect, useState } from 'react';

import { isRedirect, redirect } from '@tanstack/react-router';

import { AuthCard, FormError } from '../components/auth-form';
import { candidateReturnTo } from '../lib/candidate-return-to';
import { m } from '../paraglide/messages';
import { getResume, getSessionUserStrict } from '../server/account';
import { getSeoBase } from '../server/queries';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldLabel } from '@/components/ui/field';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { boardErrorMessage } from '@/lib/board-error-message';
import type { Resume } from '@cavuno/board';

export async function loadVerificationGate(
  deps: { returnTo: string },
  actions: {
    getResume: () => Promise<Resume>;
    getSeoBase: () => Promise<{
      boardName: string;
      language: string;
      origin: string;
    }>;
    getSessionUserStrict: () => Promise<{
      emailVerified: boolean;
      role?: string;
    } | null>;
  } = { getResume, getSeoBase, getSessionUserStrict },
) {
  // Started once, before the try: the error path needs the SEO base too,
  // and re-issuing it there made the failure case pay a second serial
  // round trip (every sibling auth route already shares one promise).
  const seoPromise = actions.getSeoBase();
  const user = await actions.getSessionUserStrict();
  const returnTo = candidateReturnTo(deps.returnTo);
  if (!user) {
    throw redirect({
      to: '/auth/sign-in',
      // The destination route will re-apply this verification gate after
      // sign-in. Passing the auth route itself would be normalized to
      // `/account` by candidateReturnTo and lose the original destination.
      search: { returnTo },
    });
  }
  const role: 'candidate' | 'employer' =
    user.role === 'employer' ? 'employer' : 'candidate';
  if (role === 'employer') {
    return {
      emailVerified: user.emailVerified,
      role,
      resume: null,
      seo: await seoPromise,
    };
  }
  try {
    const [resume, seo] = await Promise.all([actions.getResume(), seoPromise]);
    return {
      emailVerified: user.emailVerified,
      role,
      resume: user.emailVerified ? resume : null,
      seo,
    };
  } catch (error) {
    if (isRedirect(error)) throw error;
    return {
      emailVerified: user.emailVerified,
      role,
      resume: null,
      seo: await seoPromise,
    };
  }
}

export function VerifyEmailRequiredView({
  emailVerified,
  role,
  resume,
  returnTo,
  verifyOtpCodeAction,
  resendOtpAction,
  updateNotificationPreferenceAction,
  invalidate,
  navigate,
  reportActionError,
  renderResumeUpload,
}: {
  emailVerified: boolean;
  role: 'candidate' | 'employer';
  resume: Resume | null;
  returnTo: string;
  verifyOtpCodeAction: (input: {
    data: { code: string };
  }) => Promise<{ ok: true } | { ok: false; code?: string; message: string }>;
  resendOtpAction: () => Promise<
    { ok: true } | { ok: false; code?: string; message: string }
  >;
  updateNotificationPreferenceAction: (input: {
    data: { channel: 'recommendedJobEmails'; subscribed: boolean };
  }) => Promise<void>;
  invalidate: (sync?: boolean) => Promise<void>;
  navigate: (href: string) => Promise<void>;
  reportActionError: () => void;
  renderResumeUpload: (resume: Resume) => React.ReactNode;
}) {
  const [step, setStep] = useState<'code' | 'resume'>(() =>
    emailVerified && role === 'candidate' ? 'resume' : 'code',
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (!emailVerified) return;
    setError(null);
    if (role === 'employer') {
      void navigate(returnTo);
      return;
    }
    setStep('resume');
  }, [emailVerified, navigate, role, returnTo]);

  // Shared by the auto-submit (`onComplete`) and the form's implicit
  // Enter-key submission — the sixth digit IS the submit action.
  async function verify(code: string) {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const result = await verifyOtpCodeAction({ data: { code: code.trim() } });
      if (result.ok) {
        await invalidate();
        if (role === 'candidate') setStep('resume');
      } else {
        await invalidate(true);
        setError(boardErrorMessage(result));
      }
    } catch {
      setError(m.candidateAction_errorText());
    } finally {
      setPending(false);
    }
  }

  if (emailVerified && role === 'employer') return null;

  if (step === 'resume') {
    return (
      <ResumeOfferStep
        resume={resume}
        returnTo={returnTo}
        updateNotificationPreferenceAction={updateNotificationPreferenceAction}
        navigate={navigate}
        reportActionError={reportActionError}
        renderResumeUpload={renderResumeUpload}
      />
    );
  }

  return (
    <AuthCard
      title={m.authVerifyEmailRequired_cardTitle()}
      supportingText={m.authVerifyEmailRequired_introText()}
    >
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          void verify(String(form.get('code')));
        }}
      >
        <Field>
          <FieldLabel htmlFor="code">
            {m.authVerifyEmailRequired_codeLabel()}
          </FieldLabel>
          <InputOTP
            id="code"
            name="code"
            maxLength={6}
            inputMode="numeric"
            autoComplete="one-time-code"
            data-test="otp-code"
            containerClassName="justify-center"
            disabled={pending}
            onComplete={(code: string) => void verify(code)}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} className="size-10" />
              <InputOTPSlot index={1} className="size-10" />
              <InputOTPSlot index={2} className="size-10" />
              <InputOTPSlot index={3} className="size-10" />
              <InputOTPSlot index={4} className="size-10" />
              <InputOTPSlot index={5} className="size-10" />
            </InputOTPGroup>
          </InputOTP>
          <FormError message={error} />
        </Field>
        {pending ? (
          <p
            role="status"
            className="text-muted-foreground text-center text-sm"
          >
            {m.authVerifyEmailRequired_verifyingLabel()}
          </p>
        ) : null}
      </form>

      {resent ? (
        <Alert role="status">
          <AlertDescription>
            {m.authVerifyEmailRequired_resentText()}
          </AlertDescription>
        </Alert>
      ) : null}

      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full"
        data-test="otp-resend"
        disabled={resending}
        onClick={async () => {
          setError(null);
          setResent(false);
          setResending(true);
          try {
            const result = await resendOtpAction();
            if (result.ok) {
              setResent(true);
            } else {
              setError(boardErrorMessage(result));
            }
          } catch {
            setError(m.candidateAction_errorText());
          } finally {
            setResending(false);
          }
        }}
      >
        {resending
          ? m.authVerifyEmailRequired_sendingLabel()
          : m.authVerifyEmailRequired_resendLabel()}
      </Button>
    </AuthCard>
  );
}

function ResumeOfferStep({
  resume,
  returnTo,
  updateNotificationPreferenceAction,
  navigate,
  reportActionError,
  renderResumeUpload,
}: {
  resume: Resume | null;
  returnTo: string;
  updateNotificationPreferenceAction: (input: {
    data: { channel: 'recommendedJobEmails'; subscribed: boolean };
  }) => Promise<void>;
  navigate: (href: string) => Promise<void>;
  reportActionError: () => void;
  renderResumeUpload: (resume: Resume) => React.ReactNode;
}) {
  const [recommendationEmails, setRecommendationEmails] = useState(false);
  const [recommendationPending, setRecommendationPending] = useState(false);
  // Decided once on entry: the offer is only for the empty first-run state.
  // A candidate whose resume is already on file (or whose resume state failed
  // to load) continues straight to the destination; uploading DURING the step
  // updates `resume` without re-triggering this.
  const [offerUpload] = useState(
    () => resume !== null && !resume.hasResumeOnFile,
  );

  useEffect(() => {
    if (!offerUpload) void navigate(returnTo);
  }, [navigate, offerUpload, returnTo]);

  if (!offerUpload) return null;

  return (
    <AuthCard
      title={m.authVerifyEmailRequired_resumeTitle()}
      supportingText={m.authVerifyEmailRequired_resumeIntroText()}
    >
      {resume ? renderResumeUpload(resume) : null}
      <div
        className="border-border flex items-start gap-3 rounded-lg border p-4"
        data-test="recommendation-email-opt-in"
      >
        <Checkbox
          className="mt-0.5 shrink-0"
          checked={recommendationEmails}
          disabled={recommendationPending}
          aria-label={m.notificationSettings_recommendedJobEmailsTitle()}
          onCheckedChange={async (checked) => {
            setRecommendationPending(true);
            try {
              await updateNotificationPreferenceAction({
                data: {
                  channel: 'recommendedJobEmails',
                  subscribed: checked,
                },
              });
              setRecommendationEmails(checked);
            } catch {
              reportActionError();
            } finally {
              setRecommendationPending(false);
            }
          }}
        />
        <span>
          <span className="block font-medium">
            {m.notificationSettings_recommendedJobEmailsTitle()}
          </span>
          <span className="text-muted-foreground block text-sm">
            {m.notificationSettings_recommendedJobEmailsDescription()}
          </span>
        </span>
      </div>
      <Button
        type="button"
        variant={resume?.hasResumeOnFile ? 'default' : 'outline'}
        size="lg"
        className="w-full"
        data-test="resume-step-continue"
        onClick={() => void navigate(returnTo)}
      >
        {resume?.hasResumeOnFile
          ? m.authVerifyEmailRequired_resumeContinueLabel()
          : m.authVerifyEmailRequired_resumeSkipLabel()}
      </Button>
    </AuthCard>
  );
}
