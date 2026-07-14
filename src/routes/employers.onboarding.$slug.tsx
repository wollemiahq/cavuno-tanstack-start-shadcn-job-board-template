import { useState } from 'react';

import {
  Link,
  createFileRoute,
  redirect,
  useRouter,
} from '@tanstack/react-router';

import { handleEmployerLoaderError } from '../lib/employer-loader-auth';
import { m } from '../paraglide/messages';
import { cancelClaim, listCompanies, sendWorkEmail } from '../server/employers';

import { EmployerIdentityAvatar } from '@/components/account-shell';
import { Page, PageContent } from '@/components/layout/page';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import type { CompanyMembership } from '@cavuno/board';

export const Route = createFileRoute('/employers/onboarding/$slug')({
  loader: async ({ params }) => {
    let memberships;
    try {
      memberships = await listCompanies();
    } catch (error) {
      handleEmployerLoaderError(error, `/employers/onboarding/${params.slug}`);
    }
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
    return { membership };
  },
  head: () => ({ meta: [{ title: m.employerDashboard_metaTitle() }] }),
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
              <WorkEmailStep slug={slug} membership={membership} />
            ) : membership.status === 'awaiting_admin' ? (
              <StaticStep
                title={m.employerOnboarding_awaitingAdminTitle()}
                body={m.employerOnboarding_awaitingAdminBody({
                  company: membership.company.name,
                })}
              />
            ) : (
              <StaticStep
                title={m.employerOnboarding_rejectedTitle()}
                body={m.employerOnboarding_rejectedBody({
                  company: membership.company.name,
                })}
              />
            )}
            <FooterActions slug={slug} />
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
    const result = await sendWorkEmail({
      data: { slug, body: { workEmail: target } },
    });
    if (!result.ok) {
      setStatus('error');
      setMessage(result.message);
      return;
    }
    setStatus('idle');
    setEditing(false);
    await router.invalidate();
  }

  if (!editing && membership.workEmail) {
    const verifiedEmail = membership.workEmail;
    return (
      <div className="space-y-5">
        <StepHeading
          title={m.employerOnboarding_emailSentTitle()}
          body={m.employerOnboarding_emailSentBody({ email: verifiedEmail })}
        />
        <ButtonGroup className="mx-auto flex-wrap">
          <Button
            variant="outline"
            disabled={status === 'sending'}
            onClick={() => send(verifiedEmail)}
          >
            {status === 'sending' ? <Spinner data-icon="inline-start" /> : null}
            {status === 'sending'
              ? m.employerDashboard_sendingLabel()
              : m.employerOnboarding_resendLabel()}
          </Button>
          <Button variant="ghost" onClick={() => setEditing(true)}>
            {m.employerOnboarding_changeEmailLabel()}
          </Button>
        </ButtonGroup>
        {status === 'error' ? (
          <Alert variant="destructive">
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        ) : null}
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
        className="mx-auto max-w-sm text-left"
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
      <ButtonGroup orientation="vertical" className="mx-auto w-full max-w-sm">
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
          <Button
            type="button"
            variant="ghost"
            onClick={() => setEditing(false)}
          >
            {m.employerOnboarding_backLabel()}
          </Button>
        ) : null}
      </ButtonGroup>
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

function StaticStep({ title, body }: { title: string; body: string }) {
  return <StepHeading title={title} body={body} />;
}

function FooterActions({ slug }: { slug: string }) {
  const router = useRouter();
  return (
    <div className="border-border flex flex-wrap items-center justify-center gap-2 border-t pt-6">
      <Link
        to="/employers/dashboard"
        className={buttonVariants({ variant: 'outline', size: 'sm' })}
      >
        {m.employerOnboarding_backLabel()}
      </Link>
      <Button
        variant="ghost"
        size="sm"
        onClick={async () => {
          await cancelClaim({ data: { slug } });
          await router.invalidate();
          await router.navigate({ to: '/employers/dashboard' });
        }}
      >
        {m.employerDashboard_cancelClaimLabel()}
      </Button>
    </div>
  );
}
