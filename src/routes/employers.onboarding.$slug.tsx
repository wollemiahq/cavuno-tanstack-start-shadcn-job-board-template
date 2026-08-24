import { useState } from 'react';

import { createFileRoute, redirect, useRouter } from '@tanstack/react-router';

import { boardErrorMessage } from '../lib/board-error-message';
import {
  handleEmployerLoaderError,
  isReauthRetry,
} from '../lib/employer-loader-auth';
import { m } from '../paraglide/messages';
import { cancelClaim, listCompanies, sendWorkEmail } from '../server/employers';
import { getSeoBase } from '../server/queries';

import { EmployerIdentityAvatar } from '@/components/account-shell';
import { Page, PageContent } from '@/components/layout/page';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { toastActionError } from '@/lib/action-toast';
import { headTitle } from '@/lib/page-title';
import type { CompanyMembership } from '@cavuno/board';

export const Route = createFileRoute('/employers/onboarding/$slug')({
  loader: async ({ params, location }) => {
    let loaded;
    try {
      loaded = await Promise.all([listCompanies(), getSeoBase()]);
    } catch (error) {
      return await handleEmployerLoaderError(
        error,
        `/employers/onboarding/${params.slug}`,
        { retried: isReauthRetry(location) },
      );
    }
    const [memberships, seo] = loaded;
    const membership = memberships.data.find(
      (candidate) => candidate.company.slug === params.slug,
    );
    if (!membership) throw redirect({ to: '/employers/dashboard' });
    if (membership.status === 'approved') {
      throw redirect({
        to: '/employers/companies/$slug',
        params: { slug: params.slug },
      });
    }
    return { membership, seo };
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: headTitle(
          loaderData?.seo.boardName,
          m.employerDashboard_metaTitle(),
        ),
      },
    ],
  }),
  staticData: { ownsMain: true },
  component: OnboardingPage,
});

function OnboardingPage() {
  const { membership } = Route.useLoaderData();
  const { slug } = Route.useParams();

  return (
    <Page width="narrow">
      <PageContent>
        <Card className="mx-auto w-full max-w-xl">
          <CardHeader className="justify-items-center text-center">
            <EmployerIdentityAvatar
              name={membership.company.name}
              logoUrl={membership.company.logoUrl}
            />
          </CardHeader>
          <CardContent className="space-y-8 text-center">
            {membership.status === 'pending_work_email' ? (
              <WorkEmailStep
                key={`${membership.id}:${slug}`}
                slug={slug}
                membership={membership}
              />
            ) : membership.status === 'awaiting_admin' ? (
              <div className="space-y-5">
                <StepHeading
                  title={m.employerOnboarding_awaitingAdminTitle()}
                  body={m.employerOnboarding_awaitingAdminBody({
                    company: membership.company.name,
                  })}
                />
                <CancelClaimButton slug={slug} />
              </div>
            ) : (
              <div className="space-y-5">
                <StepHeading
                  title={m.employerOnboarding_rejectedTitle()}
                  body={m.employerOnboarding_rejectedBody({
                    company: membership.company.name,
                  })}
                />
                <CancelClaimButton slug={slug} />
              </div>
            )}
          </CardContent>
        </Card>
      </PageContent>
    </Page>
  );
}

function WorkEmailStep({
  slug,
  membership,
}: {
  slug: string;
  membership: CompanyMembership;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(!membership.workEmail);
  const [email, setEmail] = useState(membership.workEmail ?? '');
  const [status, setStatus] = useState<'idle' | 'sending' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function send(target: string) {
    setStatus('sending');
    setMessage('');
    try {
      const result = await sendWorkEmail({
        data: { slug, body: { workEmail: target } },
      });
      if (!result.ok) {
        setStatus('error');
        setMessage(boardErrorMessage(result));
        return;
      }
      setStatus('idle');
      setEditing(false);
      await router.invalidate();
    } catch {
      // A rejecting call (network drop, 5xx) must not strand "Sending".
      setStatus('error');
      setMessage(m.employerCompany_genericError());
    }
  }

  if (!editing && membership.workEmail) {
    const verifiedEmail = membership.workEmail;
    return (
      <div className="space-y-6">
        <StepHeading
          title={m.employerOnboarding_emailSentTitle()}
          body={m.employerOnboarding_emailSentBody({ email: verifiedEmail })}
        />
        {/* Fastest path first: jump straight to the inbox. */}
        <div className="flex flex-wrap justify-center gap-2">
          <a
            href="https://mail.google.com/"
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: 'outline' })}
          >
            {m.employerOnboarding_openGmailLabel()}
          </a>
          <a
            href="https://outlook.live.com/mail/"
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: 'outline' })}
          >
            {m.employerOnboarding_openOutlookLabel()}
          </a>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={status === 'sending'}
            onClick={() => send(verifiedEmail)}
          >
            {status === 'sending' ? <Spinner data-icon="inline-start" /> : null}
            {status === 'sending'
              ? m.employerDashboard_sendingLabel()
              : m.employerOnboarding_resendLabel()}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            {m.employerOnboarding_changeEmailLabel()}
          </Button>
        </div>
        {status === 'error' ? (
          <Alert variant="destructive">
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        ) : null}
        <CancelClaimButton slug={slug} />
      </div>
    );
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        void send(email.trim());
      }}
    >
      <StepHeading
        title={m.employerOnboarding_verifyTitle()}
        body={m.employerOnboarding_verifyBody({
          company: membership.company.name,
        })}
      />
      <Field
        className="mx-auto max-w-sm text-start"
        data-invalid={status === 'error'}
      >
        <FieldLabel htmlFor="work-email">
          {m.employerDashboard_workEmailLabel()}
        </FieldLabel>
        <Input
          id="work-email"
          type="email"
          value={email}
          placeholder={m.employerDashboard_workEmailPlaceholder()}
          onChange={(event) => setEmail(event.currentTarget.value)}
          aria-invalid={status === 'error'}
          required
          autoFocus
        />
        {status === 'error' ? <FieldError>{message}</FieldError> : null}
      </Field>
      <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-2">
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={status === 'sending'}
        >
          {status === 'sending' ? <Spinner data-icon="inline-start" /> : null}
          {status === 'sending'
            ? m.employerDashboard_sendingLabel()
            : m.employerDashboard_sendLinkLabel()}
        </Button>
        {membership.workEmail ? (
          // A link was already sent — backing out returns to the inbox step.
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setEditing(false)}
          >
            {m.employerOnboarding_cancelLabel()}
          </Button>
        ) : (
          <CancelClaimButton slug={slug} />
        )}
      </div>
    </form>
  );
}

function StepHeading({ title, body }: { title: string; body: string }) {
  return (
    <div className="space-y-2">
      <h1 className="font-heading text-foreground text-3xl font-semibold tracking-tight">
        {title}
      </h1>
      <p className="text-muted-foreground">{body}</p>
    </div>
  );
}

/** The step's single escape hatch: withdraw the claim, back to the dashboard. */
function CancelClaimButton({ slug }: { slug: string }) {
  const router = useRouter();
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground"
        disabled={cancelling}
        onClick={async () => {
          setError(null);
          setCancelling(true);
          try {
            const result = await cancelClaim({ data: { slug } });
            if (!result.ok) {
              setError(boardErrorMessage(result));
              return;
            }
            await router.invalidate();
            await router.navigate({ to: '/employers/dashboard' });
          } catch {
            // Without this a rejecting call is an unhandled rejection and the
            // silently-skipped navigation reads as a dead button.
            void toastActionError(m.employerCompany_genericError());
          } finally {
            setCancelling(false);
          }
        }}
      >
        {m.employerDashboard_cancelClaimLabel()}
      </Button>
    </>
  );
}
