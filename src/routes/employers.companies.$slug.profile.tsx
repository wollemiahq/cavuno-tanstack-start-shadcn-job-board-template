/**
 * Company workspace — Company profile. One always-editable form over the public
 * company profile (the LinkedIn/Wellfound company-admin model): what you see is
 * what the board shows, edits save in place. It stands alone at the shared
 * employer page width — no tabs; navigate via the header account menu.
 *
 * The form prefills from `board.me.companies.retrieve` (an `EmployerCompany`,
 * loaded as `employerCompany`): unlike the public company read, that shape
 * returns the write-side fields the form edits — `summary` (tagline), the social
 * URLs, and `logoUrl` — so every field round-trips. The public `company` read
 * still supplies the header's public-page link and the markets card.
 */
import { useState } from 'react';

import { Await, createFileRoute, useRouter } from '@tanstack/react-router';
import { ExternalLinkIcon } from 'lucide-react';

import { CompanyDeleteDangerZone } from '../components/employer/company-delete-danger-zone';
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
import { getLocale } from '../paraglide/runtime';
import {
  getCompanyWorkspace,
  getEmployerCompany,
  getEmployerProfileStats,
  getEmployerProfileStatsTimeseries,
  listCompanyMembers,
  updateCompany,
} from '../server/employers';
import { getSeoBase, getCompany } from '../server/queries';

import { toEmployerProfileViewsVM } from '@/board/employer-stats-view-model';
import {
  EmployerProfileViewsStat,
  EmployerProfileViewsStatPending,
} from '@/components/employer/employer-profile-views-stat';
import { Page, PageContent } from '@/components/layout/page';
import { LogoUpload } from '@/components/logo-upload';
import { RichTextEditor } from '@/components/rich-text-editor';
import { Text } from '@/components/text';
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
import { boardErrorMessage } from '@/lib/board-error-message';
import { headTitle } from '@/lib/page-title';
import type { EmployerProfileViewsPoint } from '@cavuno/board';

/**
 * A company's LinkedIn page always lives under `/company/`, so that segment is
 * part of the field's prefix — the employer types (and sees) just the slug.
 * The strip list keeps the bare-domain form second so pasting a URL without
 * `/company` still normalizes instead of doubling the segment.
 */
const LINKEDIN_COMPANY_DOMAIN = 'linkedin.com/company';
const LINKEDIN_COMPANY_DOMAINS = [LINKEDIN_COMPANY_DOMAIN, 'linkedin.com'];

export const Route = createFileRoute('/employers/companies/$slug/profile')({
  loader: async ({ params, location }) => {
    try {
      const [workspace, company, employerCompany, members, seo] =
        await Promise.all([
          getCompanyWorkspace({ data: { slug: params.slug } }),
          getCompany({ data: { companySlug: params.slug } }),
          getEmployerCompany({ data: { slug: params.slug } }),
          listCompanyMembers({ data: { slug: params.slug } }).catch(() => ({
            data: [],
          })),
          getSeoBase(),
        ]);
      // Reporting is non-critical: defer both profile-views reads so a slow or
      // failing analytics backend never blocks the profile form's first paint.
      // They stream in together via a single <Await>-able promise (stable across
      // re-renders); each read degrades to zeros (the stat shows its honest
      // "No views yet" state) and is never fatal. The retrieve endpoint itself
      // zero-fills on outage.
      const profileViews = Promise.all([
        getEmployerProfileStats({ data: { slug: params.slug } })
          .then((result) => result.profileViews)
          .catch(() => 0),
        getEmployerProfileStatsTimeseries({ data: { slug: params.slug } })
          .then((result) => result.data)
          .catch(() => [] as EmployerProfileViewsPoint[]),
      ]).then(([total, points]) => ({ total, points }));
      return {
        workspace,
        company,
        employerCompany,
        members,
        seo,
        profileViews,
      };
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

type EmployerCompany = Awaited<ReturnType<typeof getEmployerCompany>>;

function stripProtocol(url: string): string {
  return url.replace(/^https?:\/\//i, '');
}

function CompanyProfilePage() {
  const { workspace, company, employerCompany, members } =
    Route.useLoaderData();
  // Typed as possibly-undefined: the loader always supplies this on the happy
  // path, but component-level tests spy the loader data without it, so the
  // render guards on its presence rather than assuming the deferred promise.
  const { profileViews } = Route.useLoaderData() as {
    profileViews?: Promise<{
      total: number;
      points: EmployerProfileViewsPoint[];
    }>;
  };

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

          {/* Profile-views stat — deferred (streamed via <Await>) so a slow or
              failing analytics backend never blocks the form. Its zero state
              covers the no-views window; the fallback reserves its space.
              Guarded on the promise so the existing loader-spied tests (which
              don't supply it) still render the form unchanged. */}
          {profileViews ? (
            <Await
              promise={profileViews}
              fallback={<EmployerProfileViewsStatPending />}
            >
              {({ total, points }) => (
                <EmployerProfileViewsStat
                  vm={toEmployerProfileViewsVM(total, points, getLocale())}
                />
              )}
            </Await>
          ) : null}

          <ProfileEditorCard slug={workspace.slug} company={employerCompany} />

          <CompanyDeleteDangerZone
            slug={workspace.slug}
            companyName={employerCompany.name}
            isAdmin={workspace.membership?.role === 'admin'}
            otherApprovedMembers={Math.max(0, (members?.data.length ?? 0) - 1)}
          />

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
  company: EmployerCompany;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: company.name,
    website: stripProtocol(company.website ?? ''),
    summary: company.summary ?? '',
    description: company.description ?? '',
    // Stored as full URLs; the fields edit the bare handle behind the domain
    // addon, so prefill strips the scheme + domain back down to that handle.
    linkedinUrl: company.linkedinUrl
      ? stripSocialHandle(company.linkedinUrl, LINKEDIN_COMPANY_DOMAINS)
      : '',
    xUrl: company.xUrl
      ? stripSocialHandle(company.xUrl, ['x.com', 'twitter.com'])
      : '',
    facebookUrl: company.facebookUrl
      ? stripSocialHandle(company.facebookUrl, ['facebook.com'])
      : '',
  });
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function save() {
    setStatus('saving');
    setMessage('');
    const website = form.website.trim();
    try {
      await runSave(website);
    } catch {
      // A rejecting call (network drop, 5xx) must not strand the "Saving"
      // state without feedback.
      setStatus('error');
      setMessage(m.employerCompany_genericError());
    }
  }

  async function runSave(website: string) {
    const result = await updateCompany({
      data: {
        slug,
        body: {
          name: form.name.trim(),
          website: website ? `https://${website}` : '',
          description: isRichTextEmpty(form.description)
            ? ''
            : form.description,
          // Every field round-trips (prefilled from the EmployerCompany read),
          // so each is always sent: a blank input now means "clear it", not
          // "keep the stored value we couldn't read".
          summary: form.summary.trim(),
          linkedinUrl: form.linkedinUrl.trim()
            ? toSocialUrl(
                form.linkedinUrl,
                LINKEDIN_COMPANY_DOMAIN,
                LINKEDIN_COMPANY_DOMAINS,
              )
            : '',
          xUrl: form.xUrl.trim()
            ? toSocialUrl(form.xUrl, 'x.com', ['x.com', 'twitter.com'])
            : '',
          facebookUrl: form.facebookUrl.trim()
            ? toSocialUrl(form.facebookUrl, 'facebook.com')
            : '',
        },
      },
    });
    if (!result.ok) {
      setStatus('error');
      setMessage(boardErrorMessage(result));
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
          {/* Logo upload posts multipart to `uploadCompanyLogo`
              (`board.me.companies.uploadLogo`) and invalidates so the new
              `logoUrl` repaints — same mechanism as the candidate avatar flow. */}
          <Field>
            <FieldLabel>{m.employerProfile_logoLabel()}</FieldLabel>
            <LogoUpload
              slug={slug}
              logoUrl={company.logoUrl}
              companyName={company.name}
            />
            <FieldDescription>{m.employerProfile_logoHint()}</FieldDescription>
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
                domain={LINKEDIN_COMPANY_DOMAIN}
                domains={LINKEDIN_COMPANY_DOMAINS}
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
