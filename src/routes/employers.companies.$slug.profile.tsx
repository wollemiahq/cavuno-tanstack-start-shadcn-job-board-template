/**
 * Company workspace — Company profile. One always-editable form over the public
 * company profile (the LinkedIn/Wellfound company-admin model): what you see is
 * what the board shows, edits save in place. It stands alone at the shared
 * employer page width — no tabs; navigate via the header account menu.
 *
 * `summary` (tagline) and the social links are write-only on the v1 wire, so
 * they start blank and are only sent when filled (never wiping a stored value).
 */
import { useState } from 'react';

import {
  createFileRoute,
  getRouteApi,
  useRouter,
} from '@tanstack/react-router';
import { ExternalLinkIcon } from 'lucide-react';

import {
  handleEmployerLoaderError,
  isReauthRetry,
} from '../lib/employer-loader-auth';
import {
  isRichTextEmpty,
  stripSocialHandle,
  toSocialUrl,
} from '../lib/post-form';
import { m } from '../paraglide/messages';
import { getCompanyWorkspace, updateCompany } from '../server/employers';
import { getSeoBase, getCompany } from '../server/queries';

import { EmployerIdentityAvatar } from '@/components/account-shell';
import { Page, PageContent } from '@/components/layout/page';
import { Text } from '@/components/text';
import { RichTextEditor } from '@/components/rich-text-editor';
import { Badge } from '@/components/ui/badge';
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
  loader: async ({ params, location }) => {
    try {
      const [workspace, company, seo] = await Promise.all([
        getCompanyWorkspace({ data: { slug: params.slug } }),
        getCompany({ data: { companySlug: params.slug } }),
        getSeoBase(),
      ]);
      return { workspace, company, seo };
    } catch (error) {
      return await handleEmployerLoaderError(
        error,
        `/employers/companies/${params.slug}/profile`,
        { retried: isReauthRetry(location) },
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
  rootApi.useLoaderData();

  return (
    <Page width="content">
      <PageContent>
        <div className="space-y-6">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <Text as="h1" variant="heading1">
                {m.employerCompany_profileHeading()}
              </Text>
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

          {company.markets.length > 0 ? (
            <Card size="sm">
              <CardContent className="space-y-2">
                <p className="text-muted-foreground text-sm">
                  {m.employerProfile_marketsLabel()}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {company.markets.map((market) => (
                    <Badge key={market.slug} variant="secondary">
                      {market.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </PageContent>
    </Page>
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
          ...(form.summary.trim() ? { summary: form.summary.trim() } : {}),
          // Write-only fields: only sent when filled, so a blank input never
          // wipes a stored link we can't read back to prefill.
          ...(form.linkedinUrl.trim()
            ? { linkedinUrl: toSocialUrl(form.linkedinUrl, 'linkedin.com') }
            : {}),
          ...(form.xUrl.trim()
            ? {
                xUrl: toSocialUrl(form.xUrl, 'x.com', ['x.com', 'twitter.com']),
              }
            : {}),
          ...(form.facebookUrl.trim()
            ? { facebookUrl: toSocialUrl(form.facebookUrl, 'facebook.com') }
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

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">
              {m.employerProfile_linksHeading()}
            </legend>
            <div className="grid gap-4 sm:grid-cols-3">
              <SocialField
                id="company-linkedin"
                label={m.employerProfile_linkedinLabel()}
                domain="linkedin.com"
                domains={['linkedin.com']}
                value={form.linkedinUrl}
                onChange={(linkedinUrl) => setForm({ ...form, linkedinUrl })}
              />
              <SocialField
                id="company-x"
                label={m.employerProfile_xLabel()}
                domain="x.com"
                domains={['x.com', 'twitter.com']}
                value={form.xUrl}
                onChange={(xUrl) => setForm({ ...form, xUrl })}
              />
              <SocialField
                id="company-facebook"
                label={m.employerProfile_facebookLabel()}
                domain="facebook.com"
                domains={['facebook.com']}
                value={form.facebookUrl}
                onChange={(facebookUrl) => setForm({ ...form, facebookUrl })}
              />
            </div>
            <FieldDescription>{m.employerProfile_linksHint()}</FieldDescription>
          </fieldset>

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

function SocialField({
  id,
  label,
  domain,
  domains,
  value,
  onChange,
}: {
  id: string;
  label: string;
  domain: string;
  domains: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <InputGroup>
        <InputGroupAddon>
          <InputGroupText>{domain}/</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput
          id={id}
          value={value}
          // Pasting a full URL auto-strips scheme + domain to the bare handle.
          onChange={(event) =>
            onChange(stripSocialHandle(event.currentTarget.value, domains))
          }
        />
      </InputGroup>
    </Field>
  );
}
