/**
 * Company workspace — Company profile tab. One always-editable form over the
 * public company profile (the LinkedIn/Wellfound company-admin model): what
 * you see is what the board shows, edits save in place. Jobs live on the Jobs
 * tab — this page is only the profile.
 *
 * `summary` (tagline) is write-only on the v1 wire, so it starts blank.
 */
import { useState } from 'react';

import {
  createFileRoute,
  getRouteApi,
  useRouter,
} from '@tanstack/react-router';
import { ExternalLinkIcon } from 'lucide-react';

import { handleEmployerLoaderError } from '../lib/employer-loader-auth';
import { isRichTextEmpty } from '../lib/post-form';
import { m } from '../paraglide/messages';
import { getCompanyWorkspace, updateCompany } from '../server/employers';
import { getSeoBase, getCompany } from '../server/queries';

import { EmployerCompanyShell } from '@/components/account-shell';
import { RichTextEditor } from '@/components/rich-text-editor';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group';
import { headTitle } from '@/lib/page-title';

const rootApi = getRouteApi('__root__');

export const Route = createFileRoute('/employers/companies/$slug/profile')({
  loader: async ({ params }) => {
    try {
      const [workspace, company, seo] = await Promise.all([
        getCompanyWorkspace({ data: { slug: params.slug } }),
        getCompany({ data: { companySlug: params.slug } }),
        getSeoBase(),
      ]);
      return { workspace, company, seo };
    } catch (error) {
      handleEmployerLoaderError(
        error,
        `/employers/companies/${params.slug}/profile`,
      );
    }
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: headTitle(
          loaderData?.seo.boardName,
          m.employerCompany_metaTitle(),
        ),
      },
    ],
  }),
  staticData: { ownsMain: true },
  component: CompanyProfilePage,
});

type PublicCompany = Awaited<ReturnType<typeof getCompany>>;

function stripProtocol(url: string): string {
  return url.replace(/^https?:\/\//i, '');
}

function CompanyProfilePage() {
  const { workspace, company } = Route.useLoaderData();
  const membershipCompany = workspace.membership?.company;
  rootApi.useLoaderData();

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
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-6">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h1 className="font-heading text-2xl font-semibold tracking-tight">
                {m.employerCompany_profileHeading()}
              </h1>
              <p className="text-muted-foreground text-sm">
                {m.employerProfile_editIntroText({ company: company.name })}
              </p>
            </div>
            {company.links.public ? (
              <a
                href={company.links.public}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants({ variant: 'outline' })}
              >
                {m.employerProfile_viewPublicLabel()}
                <ExternalLinkIcon data-icon="inline-end" aria-hidden />
              </a>
            ) : null}
          </header>

          <ProfileEditorCard slug={workspace.slug} company={company} />
        </div>

        <aside
          aria-label={m.employerProfile_aboutCardHeading({
            company: company.name,
          })}
        >
          <Card size="sm">
            <CardHeader>
              <CardTitle>
                {m.employerProfile_aboutCardHeading({ company: company.name })}
              </CardTitle>
            </CardHeader>
            <CardContent>
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
                        {stripProtocol(company.website)}
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
            </CardContent>
          </Card>
        </aside>
      </div>
    </EmployerCompanyShell>
  );
}

function ProfileEditorCard({
  slug,
  company,
}: {
  slug: string;
  company: PublicCompany;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: company.name,
    website: stripProtocol(company.website ?? ''),
    summary: '',
    description: company.description ?? '',
  });
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function save() {
    setStatus('saving');
    setMessage('');
    const website = form.website.trim();
    const result = await updateCompany({
      data: {
        slug,
        body: {
          name: form.name.trim(),
          website: website ? `https://${website}` : '',
          description: isRichTextEmpty(form.description)
            ? ''
            : form.description,
          ...(form.summary.trim() ? { summary: form.summary.trim() } : {}),
        },
      },
    });
    if (!result.ok) {
      setStatus('error');
      setMessage(result.message);
      return;
    }
    setStatus('idle');
    await router.invalidate();
  }

  return (
    <Card>
      <CardContent>
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <div className="grid gap-5 sm:grid-cols-2">
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
              <FieldLabel htmlFor="company-website">
                {m.employerCompany_websiteLabel()}
              </FieldLabel>
              <InputGroup>
                <InputGroupAddon>
                  <InputGroupText>
                    {m.employerDashboard_websiteProtocolPrefix()}
                  </InputGroupText>
                </InputGroupAddon>
                <InputGroupInput
                  id="company-website"
                  value={form.website}
                  placeholder={m.employerDashboard_websitePlaceholder()}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      website: stripProtocol(event.currentTarget.value),
                    })
                  }
                />
              </InputGroup>
            </Field>
          </div>
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
            <FieldDescription>
              {m.employerProfile_taglineHint()}
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel>{m.employerProfile_aboutHeading()}</FieldLabel>
            {/* Company descriptions are HTML on the API (rendered as-is on
                the public page), so they author as rich text, not markup. */}
            <RichTextEditor
              value={form.description}
              onChange={(description) =>
                setForm((prev) => ({ ...prev, description }))
              }
              ariaLabel={m.employerProfile_aboutHeading()}
            />
          </Field>
          {/* In-page form: primary action left-aligned, in reading flow. */}
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={status === 'saving'}>
              {status === 'saving'
                ? m.employerCompany_savingLabel()
                : m.employerCompany_saveCompanyLabel()}
            </Button>
            {status === 'error' ? <FieldError>{message}</FieldError> : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
