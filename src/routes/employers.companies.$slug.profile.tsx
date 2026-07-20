/**
 * Company workspace — Company profile tab. One always-editable form over the
 * public company profile (the LinkedIn/Wellfound company-admin model): what
 * you see is what the board shows, edits save in place. Jobs live on the Jobs
 * tab — this page is only the profile.
 *
 * `summary` (tagline) and the social links (`xUrl` / `linkedinUrl` /
 * `facebookUrl`) are writable on the employer company-update surface but are
 * NOT returned by any read the board exposes to this frontend — the public
 * `companies.retrieve` shape omits them, and `me.companies.list` only carries a
 * slim company (name/slug/website/logoUrl). So these fields start blank and are
 * "set or replace" only: an empty field is left out of the patch to preserve
 * whatever is stored. The company `logoUrl` is read-only here — the SDK exposes
 * no employer logo-write path (see the report), so the logo is a preview only.
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

import {
  EmployerCompanyShell,
  EmployerIdentityAvatar,
} from '@/components/account-shell';
import { RichTextEditor } from '@/components/rich-text-editor';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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

/** A pasted social link may omit its scheme; the API wants an absolute URL. */
function ensureHttps(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
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
        logoUrl: company.logoUrl ?? membershipCompany?.logoUrl ?? null,
      }}
      active="profile"
    >
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
    linkedinUrl: '',
    xUrl: '',
    facebookUrl: '',
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
          // Write-only fields (not returned by any read): only include a field
          // when the employer typed something, so a blank input never wipes the
          // stored value on save.
          ...(form.summary.trim() ? { summary: form.summary.trim() } : {}),
          ...(form.linkedinUrl.trim()
            ? { linkedinUrl: ensureHttps(form.linkedinUrl) }
            : {}),
          ...(form.xUrl.trim() ? { xUrl: ensureHttps(form.xUrl) } : {}),
          ...(form.facebookUrl.trim()
            ? { facebookUrl: ensureHttps(form.facebookUrl) }
            : {}),
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
          {/* Logo is read-only on this surface: the board returns `logoUrl`
              but exposes no employer logo-write path, so we preview it and do
              not offer an upload control (nothing would persist). */}
          <Field>
            <FieldLabel>{m.employerProfile_logoLabel()}</FieldLabel>
            <div className="flex items-center gap-4">
              <EmployerIdentityAvatar
                name={company.name}
                logoUrl={company.logoUrl}
                size="lg"
              />
              <FieldDescription>
                {m.employerProfile_logoHint()}
              </FieldDescription>
            </div>
          </Field>
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
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">
              {m.employerProfile_socialLinksHeading()}
            </legend>
            <FieldDescription>
              {m.employerProfile_socialLinksHint()}
            </FieldDescription>
            {/* The website field's pattern: a fixed https:// prefix with the
                scheme stripped from what the employer types, so the input holds
                a bare URL and `ensureHttps` restores the scheme on save. */}
            <div className="grid gap-5 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="company-linkedin">
                  {m.employerProfile_linkedinLabel()}
                </FieldLabel>
                <InputGroup>
                  <InputGroupAddon>
                    <InputGroupText>
                      {m.employerDashboard_websiteProtocolPrefix()}
                    </InputGroupText>
                  </InputGroupAddon>
                  <InputGroupInput
                    id="company-linkedin"
                    inputMode="url"
                    value={form.linkedinUrl}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        linkedinUrl: stripProtocol(event.currentTarget.value),
                      })
                    }
                  />
                </InputGroup>
              </Field>
              <Field>
                <FieldLabel htmlFor="company-x">
                  {m.employerProfile_xLabel()}
                </FieldLabel>
                <InputGroup>
                  <InputGroupAddon>
                    <InputGroupText>
                      {m.employerDashboard_websiteProtocolPrefix()}
                    </InputGroupText>
                  </InputGroupAddon>
                  <InputGroupInput
                    id="company-x"
                    inputMode="url"
                    value={form.xUrl}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        xUrl: stripProtocol(event.currentTarget.value),
                      })
                    }
                  />
                </InputGroup>
              </Field>
              <Field>
                <FieldLabel htmlFor="company-facebook">
                  {m.employerProfile_facebookLabel()}
                </FieldLabel>
                <InputGroup>
                  <InputGroupAddon>
                    <InputGroupText>
                      {m.employerDashboard_websiteProtocolPrefix()}
                    </InputGroupText>
                  </InputGroupAddon>
                  <InputGroupInput
                    id="company-facebook"
                    inputMode="url"
                    value={form.facebookUrl}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        facebookUrl: stripProtocol(event.currentTarget.value),
                      })
                    }
                  />
                </InputGroup>
              </Field>
            </div>
          </fieldset>
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
