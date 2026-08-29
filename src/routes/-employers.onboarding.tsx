import { useState } from 'react';

import { redirect } from '@tanstack/react-router';

import { boardErrorMessage } from '../lib/board-error-message';
import {
  handleEmployerLoaderErrorUsing,
  isReauthRetry,
} from '../lib/employer-loader-auth';
import { m } from '../paraglide/messages';
import { refreshSession } from '../server/auth';
import { cancelClaim, listCompanies, sendWorkEmail } from '../server/employers';
import { getSeoBase } from '../server/queries';

import { EmployerIdentityAvatar } from '@/components/account-shell';
import { Page, PageContent } from '@/components/layout/page';
import { MailAppLinks } from '@/components/mail-app-links';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import type { UrlSearchInput } from '@/lib/pagination';
import { textActionClass } from '@/lib/text-link';
import type { CompanyMembership } from '@cavuno/board';

export type EmployerOnboardingLoaderDependencies = {
  listCompanies: typeof listCompanies;
  getSeoBase: typeof getSeoBase;
  refreshSession: typeof refreshSession;
};

const employerOnboardingLoaderDependencies: EmployerOnboardingLoaderDependencies =
  {
    listCompanies,
    getSeoBase,
    refreshSession,
  };

export function createEmployerOnboardingLoader(
  dependencies: EmployerOnboardingLoaderDependencies = employerOnboardingLoaderDependencies,
) {
  return async ({
    params,
    location,
  }: {
    params: { slug: string };
    location: { search?: UrlSearchInput };
  }) => {
    let loaded;
    try {
      loaded = await Promise.all([
        dependencies.listCompanies(),
        dependencies.getSeoBase(),
      ]);
    } catch (error) {
      return await handleEmployerLoaderErrorUsing(
        dependencies.refreshSession,
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
  };
}

export type EmployerOnboardingViewDependencies = {
  sendWorkEmail: typeof sendWorkEmail;
  cancelClaim: typeof cancelClaim;
  invalidate: () => Promise<void>;
  navigateToDashboard: () => Promise<void>;
  showActionError: (message: string) => Promise<void>;
};

export function EmployerOnboardingPageView({
  membership,
  slug,
  dependencies,
}: {
  membership: CompanyMembership;
  slug: string;
  dependencies: EmployerOnboardingViewDependencies;
}) {
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
                dependencies={dependencies}
              />
            ) : membership.status === 'awaiting_admin' ? (
              <div className="space-y-5">
                <StepHeading
                  title={m.employerOnboarding_awaitingAdminTitle()}
                  body={m.employerOnboarding_awaitingAdminBody({
                    company: membership.company.name,
                  })}
                />
                <CancelClaimButton slug={slug} dependencies={dependencies} />
              </div>
            ) : (
              <div className="space-y-5">
                <StepHeading
                  title={m.employerOnboarding_rejectedTitle()}
                  body={m.employerOnboarding_rejectedBody({
                    company: membership.company.name,
                  })}
                />
                <CancelClaimButton slug={slug} dependencies={dependencies} />
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
  dependencies,
}: {
  slug: string;
  membership: CompanyMembership;
  dependencies: EmployerOnboardingViewDependencies;
}) {
  const [editing, setEditing] = useState(!membership.workEmail);
  const [email, setEmail] = useState(membership.workEmail ?? '');
  const [status, setStatus] = useState<
    'idle' | 'sending' | 'error' | 'committed'
  >('idle');
  const [message, setMessage] = useState('');

  async function send(target: string) {
    setStatus('sending');
    setMessage('');
    let result: Awaited<ReturnType<typeof dependencies.sendWorkEmail>>;
    try {
      result = await dependencies.sendWorkEmail({
        data: { slug, body: { workEmail: target } },
      });
    } catch {
      // A rejecting call (network drop, 5xx) must not strand "Sending".
      setStatus('error');
      setMessage(m.employerCompany_genericError());
      return;
    }
    if (!result.ok) {
      setStatus('error');
      setMessage(boardErrorMessage(result));
      return;
    }
    setStatus('committed');
    setEditing(false);
    try {
      await dependencies.invalidate();
    } catch {
      setStatus('error');
      setMessage(m.employerCompany_reconciliationError());
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
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm">
          <button
            type="button"
            className={textActionClass}
            disabled={status === 'sending' || status === 'committed'}
            onClick={() => send(verifiedEmail)}
          >
            {status === 'sending'
              ? m.employerDashboard_sendingLabel()
              : m.employerOnboarding_resendLabel()}
          </button>
          <span className="text-muted-foreground" aria-hidden>
            ·
          </span>
          <button
            type="button"
            className={textActionClass}
            onClick={() => setEditing(true)}
          >
            {m.employerOnboarding_changeEmailLabel()}
          </button>
        </div>
        <MailAppLinks />
        {status === 'error' ? (
          <Alert variant="destructive">
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        ) : null}
        <CancelClaimButton slug={slug} dependencies={dependencies} />
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
          disabled={status === 'sending' || status === 'committed'}
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
          <CancelClaimButton slug={slug} dependencies={dependencies} />
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
function CancelClaimButton({
  slug,
  dependencies,
}: {
  slug: string;
  dependencies: EmployerOnboardingViewDependencies;
}) {
  const [cancelling, setCancelling] = useState<false | 'pending' | 'committed'>(
    false,
  );
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
        disabled={Boolean(cancelling)}
        onClick={async () => {
          setError(null);
          setCancelling('pending');
          let result: Awaited<ReturnType<typeof dependencies.cancelClaim>>;
          try {
            result = await dependencies.cancelClaim({ data: { slug } });
          } catch {
            void dependencies.showActionError(m.employerCompany_genericError());
            setCancelling(false);
            return;
          }
          if (!result.ok) {
            setError(boardErrorMessage(result));
            setCancelling(false);
            return;
          }
          setCancelling('committed');
          try {
            await dependencies.invalidate();
            await dependencies.navigateToDashboard();
          } catch {
            void dependencies.showActionError(
              m.employerCompany_reconciliationError(),
            );
          }
        }}
      >
        {m.employerDashboard_cancelClaimLabel()}
      </Button>
    </>
  );
}
