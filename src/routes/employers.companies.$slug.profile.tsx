/**
 * Company workspace — Company profile tab. View mode mirrors the public
 * company page; edit mode updates the fields supported by the v1 company API.
 *
 * `summary` is write-only on the v1 wire, so edit mode starts it blank.
 */
import { useState } from 'react';

import {
  createFileRoute,
  getRouteApi,
  useRouter,
} from '@tanstack/react-router';
import { ExternalLinkIcon, PencilIcon } from 'lucide-react';

import { handleEmployerLoaderError } from '../lib/employer-loader-auth';
import { m } from '../paraglide/messages';
import { getCompanyWorkspace, updateCompany } from '../server/employers';
import { getCompany, listCompanyJobs } from '../server/queries';

import { toJobCardVM } from '@/board/job-view-model';
import { EmployerCompanyShell } from '@/components/account-shell';
import { JobCard } from '@/components/board/job-card';
import { Prose } from '@/components/prose';
import { Alert, AlertAction, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { BoardLabelOverrides } from '@cavuno/board/format';

const rootApi = getRouteApi('__root__');

export const Route = createFileRoute('/employers/companies/$slug/profile')({
  loader: async ({ params }) => {
    try {
      const [workspace, company, publicJobs] = await Promise.all([
        getCompanyWorkspace({ data: { slug: params.slug } }),
        getCompany({ data: { companySlug: params.slug } }),
        listCompanyJobs({ data: { companySlug: params.slug } }),
      ]);
      return { workspace, company, publicJobs };
    } catch (error) {
      handleEmployerLoaderError(
        error,
        `/employers/companies/${params.slug}/profile`,
      );
    }
  },
  head: () => ({ meta: [{ title: m.employerCompany_metaTitle() }] }),
  staticData: { ownsMain: true },
  component: CompanyProfilePage,
});

function CompanyProfilePage() {
  const { workspace, company, publicJobs } = Route.useLoaderData();
  const { board } = rootApi.useLoaderData();
  const [editing, setEditing] = useState(false);
  const membershipCompany = workspace.membership?.company;

  return (
    <EmployerCompanyShell
      slug={workspace.slug}
      company={{
        name: company.name,
        website: company.website,
        logoUrl: company.logoUrl ?? membershipCompany?.logoUrl ?? null,
      }}
      active="profile"
    >
      {editing ? (
        <EditMode
          slug={workspace.slug}
          company={company}
          onExit={() => setEditing(false)}
        />
      ) : (
        <ViewMode
          company={company}
          language={board.language}
          labels={board.labels}
          publicJobs={publicJobs.data}
          onEdit={() => setEditing(true)}
        />
      )}
    </EmployerCompanyShell>
  );
}

type PublicCompany = Awaited<ReturnType<typeof getCompany>>;
type PublicCompanyJobs = Awaited<ReturnType<typeof listCompanyJobs>>['data'];
type BoardLabels = BoardLabelOverrides | undefined;

function AboutCard({
  company,
  editing,
}: {
  company: PublicCompany;
  editing?: React.ReactNode;
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>
          {m.employerProfile_aboutCardHeading({ company: company.name })}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {editing ?? (
          <dl className="space-y-4 text-sm">
            {company.website ? (
              <div className="space-y-1">
                <dt className="text-muted-foreground">
                  {m.employerCompany_websiteLabel()}
                </dt>
                <dd className="break-all">
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noreferrer"
                    className="text-foreground font-medium underline-offset-4 hover:underline"
                  >
                    {company.website}
                  </a>
                </dd>
              </div>
            ) : null}
            {company.markets.length > 0 ? (
              <div className="space-y-2">
                <dt className="text-muted-foreground">
                  {m.employerProfile_marketsLabel()}
                </dt>
                <dd className="flex flex-wrap gap-1.5">
                  {company.markets.map((market) => (
                    <Badge key={market.slug} variant="secondary">
                      {market.name}
                    </Badge>
                  ))}
                </dd>
              </div>
            ) : null}
          </dl>
        )}
      </CardContent>
    </Card>
  );
}

function ViewMode({
  company,
  language,
  labels,
  publicJobs,
  onEdit,
}: {
  company: PublicCompany;
  language: string;
  labels: BoardLabels;
  publicJobs: PublicCompanyJobs;
  onEdit: () => void;
}) {
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="font-heading text-3xl font-semibold tracking-tight">
              {company.name}
            </h1>
            {company.website ? (
              <p className="text-muted-foreground text-sm">{company.website}</p>
            ) : null}
          </div>
          <Button type="button" variant="outline" onClick={onEdit}>
            <PencilIcon data-icon="inline-start" />
            {m.employerProfile_editProfileLabel()}
          </Button>
        </header>

        <section aria-labelledby="company-about-heading" className="space-y-3">
          <h2
            id="company-about-heading"
            className="font-heading text-xl font-semibold"
          >
            {m.employerProfile_aboutHeading()}
          </h2>
          {company.description ? (
            // Company descriptions arrive pre-sanitized from the Board API.
            <Prose html={company.description} />
          ) : (
            <p className="text-muted-foreground text-sm">
              {m.employerCompany_descriptionLabel()} —
            </p>
          )}
        </section>

        <section
          aria-labelledby="company-open-roles-heading"
          className="space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2
              id="company-open-roles-heading"
              className="font-heading text-xl font-semibold"
            >
              {m.employerProfile_openRolesHeading()}
            </h2>
            {company.links.public ? (
              <a
                href={company.links.public}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants({ variant: 'ghost', size: 'sm' })}
              >
                {m.employerProfile_viewPublicLabel()}
                <ExternalLinkIcon data-icon="inline-end" />
              </a>
            ) : null}
          </div>
          {publicJobs.length === 0 ? (
            <Empty className="border">
              <EmptyHeader>
                <EmptyTitle>{m.employerCompany_noJobsText()}</EmptyTitle>
                <EmptyDescription>
                  {m.employerCompany_draftNoticeText()}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="space-y-3">
              {publicJobs.slice(0, 5).map((job) => (
                <JobCard key={job.id} vm={toJobCardVM(job, language, labels)} />
              ))}
            </div>
          )}
        </section>
      </div>

      <AboutCard company={company} />
    </div>
  );
}

function EditMode({
  slug,
  company,
  onExit,
}: {
  slug: string;
  company: PublicCompany;
  onExit: () => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: company.name,
    website: company.website ?? '',
    summary: '',
    description: company.description ?? '',
  });
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function save() {
    setStatus('saving');
    setMessage('');
    const result = await updateCompany({
      data: {
        slug,
        body: {
          name: form.name.trim(),
          website: form.website.trim(),
          description: form.description.trim(),
          ...(form.summary.trim() ? { summary: form.summary.trim() } : {}),
        },
      },
    });
    if (!result.ok) {
      setStatus('error');
      setMessage(result.message);
      return;
    }
    await router.invalidate();
    onExit();
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <Alert role="status">
        <AlertDescription>{m.employerProfile_editingBanner()}</AlertDescription>
        <AlertAction>
          <Button type="button" variant="outline" size="sm" onClick={onExit}>
            {m.employerProfile_exitEditLabel()}
          </Button>
        </AlertAction>
      </Alert>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <Card>
          <CardHeader>
            <CardTitle>{m.employerCompany_profileHeading()}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <Field>
              <FieldLabel htmlFor="company-name">
                {m.employerCompany_nameLabel()}
              </FieldLabel>
              <Input
                id="company-name"
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="company-tagline">
                {m.employerProfile_taglineLabel()}
              </FieldLabel>
              <Input
                id="company-tagline"
                value={form.summary}
                onChange={(event) =>
                  setForm({ ...form, summary: event.target.value })
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="profile-description">
                {m.employerCompany_descriptionLabel()}
              </FieldLabel>
              <Textarea
                id="profile-description"
                rows={8}
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
              />
            </Field>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={status === 'saving'}>
                {status === 'saving'
                  ? m.employerCompany_savingLabel()
                  : m.employerCompany_saveCompanyLabel()}
              </Button>
              {status === 'error' ? <FieldError>{message}</FieldError> : null}
            </div>
          </CardContent>
        </Card>

        <AboutCard
          company={company}
          editing={
            <Field>
              <FieldLabel htmlFor="company-website">
                {m.employerCompany_websiteLabel()}
              </FieldLabel>
              <Input
                id="company-website"
                value={form.website}
                onChange={(event) =>
                  setForm({ ...form, website: event.target.value })
                }
              />
            </Field>
          }
        />
      </div>
    </form>
  );
}
