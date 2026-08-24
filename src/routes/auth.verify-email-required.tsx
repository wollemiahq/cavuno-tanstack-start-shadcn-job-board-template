/**
 * Verification-required gate for authenticated starter routes.
 * The signed-in-but-unverified candidate either enters the 6-digit OTP from the
 * verification email (`board.auth.verifyEmailWithCode`) or opens the magic link
 * (which lands on `/auth/verify-email`). Resend re-sends both. A successful
 * verify offers one skippable resume-upload step (the onboarding parse
 * pipeline) before continuing to the validated destination.
 */
import { useEffect, useState } from 'react';

import {
  createFileRoute,
  isRedirect,
  redirect,
  useRouter,
} from '@tanstack/react-router';

import { AuthCard, FormError } from '../components/auth-form';
import { ResumeUpload } from '../components/resume-upload';
import { candidateReturnTo } from '../lib/candidate-return-to';
import { serializeResumeOnboardingDismissal } from '../lib/resume-onboarding';
import { m } from '../paraglide/messages';
import {
  getResume,
  getResumeOnboardingDismissal,
  getSessionUserStrict,
} from '../server/account';
import { resendOtp, verifyOtpCode } from '../server/auth';
import { getSeoBase } from '../server/queries';
import { updateNotificationPreference } from '../server/settings';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldLabel } from '@/components/ui/field';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { toastActionError } from '@/lib/action-toast';
import { boardErrorMessage } from '@/lib/board-error-message';
import { headTitle } from '@/lib/page-title';
import type { Resume } from '@cavuno/board';

export const Route = createFileRoute('/auth/verify-email-required')({
  validateSearch: (search: Record<string, unknown>) => ({
    returnTo:
      typeof search.returnTo === 'string' && search.returnTo
        ? candidateReturnTo(search.returnTo)
        : undefined,
  }),
  loaderDeps: ({ search }) => ({
    returnTo: candidateReturnTo(search.returnTo),
  }),
  // Resume state for the post-verify step. Null while the candidate is still
  // unverified (the /me/resume read requires a verified email); the verify
  // success path invalidates the router, which re-runs this with the now
  // verified session. ResumeUpload's own invalidations refresh it the same
  // way, so an upload during the step updates the rendered file state.
  loader: async (context) => {
    // Started once, before the try: the error path needs the SEO base too,
    // and re-issuing it there made the failure case pay a second serial
    // round trip (every sibling auth route already shares one promise).
    const seoPromise = getSeoBase();
    const user = await getSessionUserStrict();
    const returnTo = candidateReturnTo(context?.deps?.returnTo);
    if (!user) {
      throw redirect({
        to: '/auth/sign-in',
        // The destination route will re-apply this verification gate after
        // sign-in. Passing the auth route itself would be normalized to
        // `/account` by candidateReturnTo and lose the original destination.
        search: { returnTo },
      });
    }
    const role = user.role === 'employer' ? 'employer' : 'candidate';
    if (role === 'employer') {
      return {
        emailVerified: user.emailVerified,
        role,
        resume: null,
        resumeOnboardingDismissed: false,
        userId: user.id,
        seo: await seoPromise,
      };
    }
    try {
      const [resume, dismissedFor, seo] = await Promise.all([
        getResume(),
        getResumeOnboardingDismissal().catch(() => null),
        seoPromise,
      ]);
      return {
        emailVerified: user.emailVerified,
        role,
        resume: user.emailVerified ? resume : null,
        resumeOnboardingDismissed: dismissedFor?.includes(user.id) ?? false,
        userId: user.id,
        seo,
      };
    } catch (error) {
      if (isRedirect(error)) throw error;
      return {
        emailVerified: user.emailVerified,
        role,
        resume: null,
        resumeOnboardingDismissed: false,
        userId: user.id,
        seo: await seoPromise,
      };
    }
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: headTitle(
          loaderData?.seo.boardName,
          m.authVerifyEmailRequired_title(),
        ),
      },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: VerifyEmailRequiredPage,
});

function VerifyEmailRequiredPage() {
  const router = useRouter();
  const search = Route.useSearch();
  const { emailVerified, role, resume, resumeOnboardingDismissed, userId } =
    Route.useLoaderData();
  const returnTo = candidateReturnTo(search.returnTo);
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
      void router.navigate({ href: returnTo });
      return;
    }
    setStep('resume');
  }, [emailVerified, role, router, returnTo]);

  // Shared by the auto-submit (`onComplete`) and the form's implicit
  // Enter-key submission — the sixth digit IS the submit action.
  async function verify(code: string) {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const result = await verifyOtpCode({ data: { code: code.trim() } });
      if (result.ok) {
        await router.invalidate();
        if (role === 'candidate') setStep('resume');
      } else {
        await router.invalidate({ sync: true });
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
        dismissed={resumeOnboardingDismissed}
        userId={userId}
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
            const result = await resendOtp();
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
  dismissed,
  userId,
}: {
  resume: Resume | null;
  returnTo: string;
  dismissed: boolean;
  userId: string;
}) {
  const router = useRouter();
  const [recommendationEmails, setRecommendationEmails] = useState(false);
  const [recommendationPending, setRecommendationPending] = useState(false);
  // Decided once on entry: the offer is only for the empty first-run state.
  // A candidate whose resume is already on file (or whose resume state failed
  // to load) continues straight to the destination; uploading DURING the step
  // updates `resume` without re-triggering this.
  const [offerUpload] = useState(
    () => resume !== null && !resume.hasResumeOnFile && !dismissed,
  );

  useEffect(() => {
    if (!offerUpload) void router.navigate({ href: returnTo });
  }, [offerUpload, router, returnTo]);

  if (!offerUpload) return null;

  return (
    <AuthCard
      title={m.authVerifyEmailRequired_resumeTitle()}
      supportingText={m.authVerifyEmailRequired_resumeIntroText()}
    >
      {resume ? <ResumeUpload resume={resume} /> : null}
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
              await updateNotificationPreference({
                data: {
                  channel: 'recommendedJobEmails',
                  subscribed: checked,
                },
              });
              setRecommendationEmails(checked);
            } catch {
              void toastActionError();
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
        onClick={() => {
          if (!resume?.hasResumeOnFile) {
            document.cookie = serializeResumeOnboardingDismissal(userId);
          }
          void router.navigate({ href: returnTo });
        }}
      >
        {resume?.hasResumeOnFile
          ? m.authVerifyEmailRequired_resumeContinueLabel()
          : m.authVerifyEmailRequired_resumeSkipLabel()}
      </Button>
    </AuthCard>
  );
}
