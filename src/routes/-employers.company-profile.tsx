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
import { Fragment, useState, type ReactNode } from 'react';

import { Await } from '@tanstack/react-router';
import { ExternalLinkIcon } from 'lucide-react';

import {
  CompanyDeleteDangerZone,
  companyDeletionEnabled,
} from '../components/employer/company-delete-danger-zone';
import { incomingAuthSearch } from '../lib/board-datalayer-events';
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
  deleteCompany,
  getCompanyProfileFields,
  getCompanyWorkspace,
  getEmployerCompany,
  getEmployerProfileStats,
  getEmployerProfileStatsTimeseries,
  listCompanyMembers,
  updateCompany,
  uploadCompanyLogo,
} from '../server/employers';
import {
  listCompanyObjectReferenceChoices,
  updateCompanyCustomFields,
  updateCompanyObjectReferences,
} from '../server/form-fields';
import { getSeoBase, getCompany } from '../server/queries';

import { customFieldLabel } from '@/board/custom-field-labels';
import { toEmployerProfileViewsVM } from '@/board/employer-stats-view-model';
import {
  COMPANY_FORM_BUILTINS,
  formEntryKey,
  layoutRows,
  ownerProfileDefinitions,
  requiresBuiltin,
  resolveProfileFormLayout,
  showsBuiltin,
  type CompanyFormBuiltinKey,
  type ProfileFormEntry,
} from '@/board/form-layout';
import {
  initialProfileSelections,
  profileCustomFieldsBody,
  profileObjectReferencesBody,
  type ProfileFieldValue,
  type ProfileSelections,
} from '@/board/profile-field-writes';
import { CollectionFieldPicker } from '@/components/collection-field-picker';
import {
  CustomFieldInput,
  hasCustomFieldInput,
  isCustomFieldEmpty,
} from '@/components/custom-fields-group';
import {
  EmployerProfileViewsStat,
  EmployerProfileViewsStatPending,
} from '@/components/employer/employer-profile-views-stat';
import { Page, PageContent } from '@/components/layout/page';
import { LogoUpload } from '@/components/logo-upload';
import {
  RichTextEditor,
  RICH_TEXT_MAX_CHARACTERS,
} from '@/components/rich-text-editor';
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
import type { UrlSearchInput } from '@/lib/pagination';
import type {
  BoardProfileFormField,
  EmployerProfileViewsPoint,
  UpdateEmployerCompanyBody,
} from '@cavuno/board';

/**
 * A company's LinkedIn page always lives under `/company/`, so that segment is
 * part of the field's prefix — the employer types (and sees) just the slug.
 * The strip list keeps the bare-domain form second so pasting a URL without
 * `/company` still normalizes instead of doubling the segment.
 */
const LINKEDIN_COMPANY_DOMAIN = 'linkedin.com/company';
const LINKEDIN_COMPANY_DOMAINS = [LINKEDIN_COMPANY_DOMAIN, 'linkedin.com'];

export type CompanyProfileLoaderDependencies = {
  getCompanyWorkspace: (
    ...args: Parameters<typeof getCompanyWorkspace>
  ) => ReturnType<typeof getCompanyWorkspace>;
  getCompany: (
    ...args: Parameters<typeof getCompany>
  ) => ReturnType<typeof getCompany>;
  getEmployerCompany: (
    ...args: Parameters<typeof getEmployerCompany>
  ) => ReturnType<typeof getEmployerCompany>;
  getCompanyProfileFields: (
    ...args: Parameters<typeof getCompanyProfileFields>
  ) => ReturnType<typeof getCompanyProfileFields>;
  listCompanyMembers: (
    ...args: Parameters<typeof listCompanyMembers>
  ) => ReturnType<typeof listCompanyMembers>;
  getSeoBase: (
    ...args: Parameters<typeof getSeoBase>
  ) => ReturnType<typeof getSeoBase>;
  getEmployerProfileStats: (
    ...args: Parameters<typeof getEmployerProfileStats>
  ) => ReturnType<typeof getEmployerProfileStats>;
  getEmployerProfileStatsTimeseries: (
    ...args: Parameters<typeof getEmployerProfileStatsTimeseries>
  ) => ReturnType<typeof getEmployerProfileStatsTimeseries>;
  handleEmployerLoaderError: typeof handleEmployerLoaderError;
};

const companyProfileLoaderDependencies: CompanyProfileLoaderDependencies = {
  getCompanyWorkspace,
  getCompany,
  getEmployerCompany,
  getCompanyProfileFields,
  listCompanyMembers,
  getSeoBase,
  getEmployerProfileStats,
  getEmployerProfileStatsTimeseries,
  handleEmployerLoaderError,
};

export function createCompanyProfileLoader(
  dependencies?: CompanyProfileLoaderDependencies,
) {
  return async ({
    params,
    location,
  }: {
    params: { slug: string };
    location: { search?: UrlSearchInput; searchStr?: string };
  }) => {
    const loaderDependencies = dependencies ?? companyProfileLoaderDependencies;
    try {
      const [workspace, company, employerCompany, members, seo, profileFields] =
        await Promise.all([
          loaderDependencies.getCompanyWorkspace({
            data: { slug: params.slug },
          }),
          loaderDependencies.getCompany({ data: { companySlug: params.slug } }),
          loaderDependencies.getEmployerCompany({
            data: { slug: params.slug },
          }),
          loaderDependencies
            .listCompanyMembers({ data: { slug: params.slug } })
            .catch(() => null),
          loaderDependencies.getSeoBase(),
          // Owner-editable custom fields and collection selections; the
          // built-in form renders without them.
          loaderDependencies
            .getCompanyProfileFields({ data: { slug: params.slug } })
            .catch(() => null),
        ]);
      // Reporting is non-critical: defer both profile-views reads so a slow or
      // failing analytics backend never blocks the profile form's first paint.
      // They stream in together via a single <Await>-able promise (stable across
      // re-renders); each read degrades to zeros (the stat shows its honest
      // "No views yet" state) and is never fatal. The retrieve endpoint itself
      // zero-fills on outage.
      const profileViews = Promise.all([
        loaderDependencies
          .getEmployerProfileStats({ data: { slug: params.slug } })
          .then((result) => result.profileViews)
          .catch(() => 0),
        loaderDependencies
          .getEmployerProfileStatsTimeseries({
            data: { slug: params.slug },
          })
          .then((result) => result.data)
          .catch((): EmployerProfileViewsPoint[] => []),
      ]).then(([total, points]) => ({ total, points }));
      return {
        workspace,
        company,
        employerCompany,
        members,
        seo,
        profileFields,
        profileViews,
      };
    } catch (error) {
      return await loaderDependencies.handleEmployerLoaderError(
        error,
        `/employers/companies/${params.slug}/profile`,
        {
          retried: isReauthRetry(location),
          incomingSearch: incomingAuthSearch(location),
        },
      );
    }
  };
}

export type CompanyProfileLoaderData = Awaited<
  ReturnType<ReturnType<typeof createCompanyProfileLoader>>
>;

export type CompanyProfileViewData = {
  workspace: { slug: string; membership: { role: string } | null };
  company: Pick<
    CompanyProfileLoaderData['company'],
    'name' | 'links' | 'markets'
  >;
  employerCompany: CompanyProfileLoaderData['employerCompany'];
  /** Owner-editable custom fields and collection selections, when readable. */
  profileFields?: CompanyProfileLoaderData['profileFields'];
  /**
   * The operator's company form (`board.context().forms.company`): field
   * order, visibility and required flags. Absent on an older API, where the
   * form keeps its pre-layout order.
   */
  formLayout?: readonly BoardProfileFormField[] | null;
  members?: { data: unknown[] } | null;
  profileViews?: CompanyProfileLoaderData['profileViews'];
};

export type CompanyProfileViewActions = {
  updateCompany: (
    ...args: Parameters<typeof updateCompany>
  ) => Promise<
    { ok: true; data?: object | null } | { ok: false; message: string }
  >;
  uploadCompanyLogo: (
    ...args: Parameters<typeof uploadCompanyLogo>
  ) => ReturnType<typeof uploadCompanyLogo>;
  deleteCompany: (
    ...args: Parameters<typeof deleteCompany>
  ) => Promise<
    { ok: true; data?: null } | { ok: false; code: string; message: string }
  >;
  /** Custom field and collection writes; the server functions by default. */
  updateCompanyCustomFields?: (
    ...args: Parameters<typeof updateCompanyCustomFields>
  ) => Promise<{ ok: true } | { ok: false; code: string; message: string }>;
  updateCompanyObjectReferences?: (
    ...args: Parameters<typeof updateCompanyObjectReferences>
  ) => Promise<{ ok: true } | { ok: false; code: string; message: string }>;
  listCompanyObjectReferenceChoices?: (
    ...args: Parameters<typeof listCompanyObjectReferenceChoices>
  ) => Promise<{ data: { id: string; name: string }[] }>;
  invalidate: () => Promise<void>;
  navigateToDashboard: () => Promise<void>;
  toastError: (message: string) => void;
  toastSuccess: (message: string) => void;
};

type EmployerCompany = Awaited<ReturnType<typeof getEmployerCompany>>;

function stripProtocol(url: string): string {
  return url.replace(/^https?:\/\//i, '');
}

export function CompanyProfilePageView({
  data,
  actions,
}: {
  data: CompanyProfileViewData;
  actions: CompanyProfileViewActions;
}) {
  const {
    workspace,
    company,
    employerCompany,
    members,
    profileViews,
    profileFields,
    formLayout,
  } = data;

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
              The explicit view seam may omit this non-critical stream while
              still rendering the editable profile surface. */}
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

          <ProfileEditorCard
            slug={workspace.slug}
            company={employerCompany}
            profileFields={profileFields ?? null}
            formLayout={formLayout ?? null}
            actions={actions}
          />

          <CompanyDeleteDangerZone
            slug={workspace.slug}
            companyName={employerCompany.name}
            isAdmin={workspace.membership?.role === 'admin'}
            otherApprovedMembers={
              members === null
                ? null
                : Math.max(0, (members?.data.length ?? 0) - 1)
            }
            deletionEnabled={companyDeletionEnabled(employerCompany)}
            actions={actions}
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

type CompanyProfileFields = NonNullable<
  CompanyProfileViewData['profileFields']
>;
type CompanyFormEntry = ProfileFormEntry<CompanyFormBuiltinKey>;

const SOCIAL_KEYS: ReadonlySet<CompanyFormBuiltinKey> = new Set([
  'linkedinUrl',
  'xUrl',
  'facebookUrl',
]);

function ProfileEditorCard({
  slug,
  company,
  profileFields,
  formLayout,
  actions,
}: {
  slug: string;
  company: EmployerCompany;
  profileFields: CompanyProfileFields | null;
  formLayout: readonly BoardProfileFormField[] | null;
  actions: CompanyProfileViewActions;
}) {
  // The operator's company form: built-ins by key, custom and collection
  // fields each at their own position. Only owner-editable custom and
  // collection fields become inputs. Without a layout (an older API) the form
  // keeps its pre-layout order.
  const entries = resolveProfileFormLayout(
    formLayout,
    COMPANY_FORM_BUILTINS,
    ownerProfileDefinitions(profileFields),
    { fallbackRequired: ['name'], fallbackCollectionsFirst: true },
  ).filter(
    (entry) => entry.kind !== 'custom' || hasCustomFieldInput(entry.definition),
  );
  const shows = (key: CompanyFormBuiltinKey) => showsBuiltin(entries, key);
  const requires = (key: CompanyFormBuiltinKey) =>
    requiresBuiltin(entries, key);
  const storedValues = profileFields?.customFields?.values ?? {};
  const storedSelections = profileFields?.objectReferences?.selections ?? [];

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
  const [customValues, setCustomValues] =
    useState<Record<string, ProfileFieldValue>>(storedValues);
  const [selections, setSelections] = useState<ProfileSelections>(() =>
    initialProfileSelections(storedSelections),
  );
  const [status, setStatus] = useState<
    'idle' | 'saving' | 'error' | 'committed'
  >('idle');
  const [message, setMessage] = useState('');
  const [invalidField, setInvalidField] = useState<string | null>(null);

  /**
   * The first required field left empty that native validation cannot see:
   * the rich-text description, the logo, a multi-select, a collection.
   */
  function missingRequired(): { id: string; message: string } | null {
    for (const entry of entries) {
      if (!entry.required) continue;
      let field: string | null = null;
      if (entry.kind === 'builtin') {
        if (entry.key === 'description' && isRichTextEmpty(form.description)) {
          field = m.employerProfile_aboutHeading();
        } else if (entry.key === 'logo' && !company.logoUrl) {
          field = m.employerProfile_logoLabel();
        }
      } else if (
        entry.kind === 'custom'
          ? entry.definition.type !== 'boolean' &&
            isCustomFieldEmpty(customValues[entry.key])
          : (selections[entry.key]?.length ?? 0) === 0
      ) {
        field = customFieldLabel(entry.definition);
      }
      if (field !== null) {
        return {
          id: formEntryKey(entry),
          message: m.profileForm_fieldRequiredError({ field }),
        };
      }
    }
    return null;
  }

  async function save() {
    const missing = missingRequired();
    setInvalidField(missing?.id ?? null);
    if (missing) {
      setStatus('error');
      setMessage(missing.message);
      return;
    }
    setStatus('saving');
    setMessage('');
    try {
      await runSave();
    } catch {
      // A rejecting call (network drop, 5xx) must not strand the "Saving"
      // state without feedback.
      setStatus('error');
      setMessage(m.employerCompany_genericError());
    }
  }

  /**
   * The built-in fields the form shows. Each shown field round-trips
   * (prefilled from the EmployerCompany read), so it is always sent: a blank
   * input means "clear it". A hidden field is not sent, so the value already
   * stored on the company is kept.
   */
  function companyBody(): UpdateEmployerCompanyBody {
    const website = form.website.trim();
    const body: UpdateEmployerCompanyBody = { name: form.name.trim() };
    if (shows('website')) body.website = website ? `https://${website}` : '';
    if (shows('description')) {
      body.description = isRichTextEmpty(form.description)
        ? ''
        : form.description;
    }
    if (shows('summary')) body.summary = form.summary.trim();
    if (shows('linkedinUrl')) {
      body.linkedinUrl = form.linkedinUrl.trim()
        ? toSocialUrl(
            form.linkedinUrl,
            LINKEDIN_COMPANY_DOMAIN,
            LINKEDIN_COMPANY_DOMAINS,
          )
        : '';
    }
    if (shows('xUrl')) {
      body.xUrl = form.xUrl.trim()
        ? toSocialUrl(form.xUrl, 'x.com', ['x.com', 'twitter.com'])
        : '';
    }
    if (shows('facebookUrl')) {
      body.facebookUrl = form.facebookUrl.trim()
        ? toSocialUrl(form.facebookUrl, 'facebook.com')
        : '';
    }
    return body;
  }

  async function runSave() {
    const result = await actions.updateCompany({
      data: { slug, body: companyBody() },
    });
    if (!result.ok) {
      setStatus('error');
      setMessage(boardErrorMessage(result));
      return;
    }
    const values = profileCustomFieldsBody(
      entries.flatMap((entry) => (entry.kind === 'custom' ? [entry.key] : [])),
      customValues,
      storedValues,
    );
    if (values) {
      const written = await (
        actions.updateCompanyCustomFields ?? updateCompanyCustomFields
      )({ data: { slug, body: { values } } });
      if (!written.ok) {
        setStatus('error');
        setMessage(boardErrorMessage(written));
        return;
      }
    }
    const references = profileObjectReferencesBody(
      entries.flatMap((entry) =>
        entry.kind === 'collection' ? [entry.key] : [],
      ),
      selections,
      storedSelections,
      profileFields?.objectReferences?.definitions ?? [],
    );
    if (references) {
      const written = await (
        actions.updateCompanyObjectReferences ?? updateCompanyObjectReferences
      )({ data: { slug, body: references } });
      if (!written.ok) {
        setStatus('error');
        setMessage(boardErrorMessage(written));
        return;
      }
    }
    setStatus('committed');
    // Every write landed: confirm it now, so a failed refresh below reports
    // only the stale page, not a failed save.
    actions.toastSuccess(m.employerCompany_savedText());
    try {
      await actions.invalidate();
      setStatus('idle');
    } catch {
      setMessage(m.employerCompany_reconciliationError());
    }
  }

  async function loadChoices(fieldKey: string, search: string) {
    const result = await (
      actions.listCompanyObjectReferenceChoices ??
      listCompanyObjectReferenceChoices
    )({ data: { slug, fieldKey, search: search || undefined, limit: 25 } });
    return result.data.map(({ id, name }) => ({ id, name }));
  }

  function renderBuiltin(key: CompanyFormBuiltinKey): ReactNode {
    switch (key) {
      case 'logo':
        // Logo upload posts multipart to `uploadCompanyLogo`
        // (`board.me.companies.uploadLogo`) and invalidates so the new
        // `logoUrl` repaints — same mechanism as the candidate avatar flow.
        return (
          <Field data-invalid={invalidField === 'builtin:logo' || undefined}>
            <FieldLabel>{m.employerProfile_logoLabel()}</FieldLabel>
            <LogoUpload
              slug={slug}
              logoUrl={company.logoUrl}
              companyName={company.name}
              actions={actions}
            />
            <FieldDescription>{m.employerProfile_logoHint()}</FieldDescription>
          </Field>
        );
      case 'name':
        return (
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
        );
      case 'website':
        return (
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
                required={requires('website')}
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
        );
      case 'summary':
        return (
          <Field>
            <FieldLabel htmlFor="company-tagline">
              {m.employerProfile_taglineLabel()}
            </FieldLabel>
            <Input
              id="company-tagline"
              value={form.summary}
              required={requires('summary')}
              onChange={(event) =>
                setForm({ ...form, summary: event.target.value })
              }
            />
            <FieldDescription>
              {m.employerProfile_taglineHint()}
            </FieldDescription>
          </Field>
        );
      case 'linkedinUrl':
        return (
          <SocialField
            id="company-linkedin"
            label={m.employerProfile_linkedinLabel()}
            domain={LINKEDIN_COMPANY_DOMAIN}
            domains={LINKEDIN_COMPANY_DOMAINS}
            value={form.linkedinUrl}
            required={requires('linkedinUrl')}
            onChange={(linkedinUrl) => setForm({ ...form, linkedinUrl })}
          />
        );
      case 'xUrl':
        return (
          <SocialField
            id="company-x"
            label={m.employerProfile_xLabel()}
            domain="x.com"
            domains={['x.com', 'twitter.com']}
            value={form.xUrl}
            required={requires('xUrl')}
            onChange={(xUrl) => setForm({ ...form, xUrl })}
          />
        );
      case 'facebookUrl':
        return (
          <SocialField
            id="company-facebook"
            label={m.employerProfile_facebookLabel()}
            domain="facebook.com"
            domains={['facebook.com']}
            value={form.facebookUrl}
            required={requires('facebookUrl')}
            onChange={(facebookUrl) => setForm({ ...form, facebookUrl })}
          />
        );
      case 'description':
        return (
          <Field
            data-invalid={invalidField === 'builtin:description' || undefined}
          >
            <FieldLabel>{m.employerProfile_aboutHeading()}</FieldLabel>
            {/* Company descriptions are HTML on the API (rendered as-is on
                the public page), so they author as rich text, not markup. */}
            <RichTextEditor
              value={form.description}
              onChange={(description) =>
                setForm((prev) => ({ ...prev, description }))
              }
              ariaLabel={m.employerProfile_aboutHeading()}
              maxCharacters={RICH_TEXT_MAX_CHARACTERS}
            />
          </Field>
        );
    }
  }

  function renderEntry(entry: CompanyFormEntry): ReactNode {
    if (entry.kind === 'builtin') return renderBuiltin(entry.key);
    if (entry.kind === 'custom') {
      return (
        <CustomFieldInput
          definition={entry.definition}
          required={entry.required}
          value={customValues[entry.key]}
          onChange={(value) =>
            setCustomValues((prev) => ({ ...prev, [entry.key]: value }))
          }
        />
      );
    }
    return (
      <CollectionFieldPicker
        definition={entry.definition}
        value={selections[entry.key] ?? []}
        onChange={(value) =>
          setSelections((prev) => ({ ...prev, [entry.key]: value }))
        }
        loadChoices={(search) => loadChoices(entry.key, search)}
        error={invalidField === formEntryKey(entry) ? message : null}
      />
    );
  }

  // Name beside website, and the social links as one titled group, wherever
  // the layout places them next to each other.
  const rows = layoutRows(entries, (entry) => {
    if (entry.kind !== 'builtin') return null;
    if (entry.key === 'name' || entry.key === 'website') return 'identity';
    return SOCIAL_KEYS.has(entry.key) ? 'social' : null;
  });

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
          {rows.map((row) => {
            const key = row.entries.map(formEntryKey).join('|');
            const cells = row.entries.map((entry) => (
              <Fragment key={formEntryKey(entry)}>
                {renderEntry(entry)}
              </Fragment>
            ));
            if (row.group === 'social') {
              return (
                <fieldset key={key} className="space-y-3">
                  <legend className="text-sm font-medium">
                    {m.employerProfile_linksHeading()}
                  </legend>
                  <div className="grid gap-4 sm:grid-cols-3">{cells}</div>
                  <FieldDescription>
                    {m.employerProfile_linksHint()}
                  </FieldDescription>
                </fieldset>
              );
            }
            return row.entries.length > 1 ? (
              <div key={key} className="grid gap-5 sm:grid-cols-2">
                {cells}
              </div>
            ) : (
              cells
            );
          })}
          {/* In-page form: primary action left-aligned, in reading flow. */}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="submit"
              disabled={status === 'saving' || status === 'committed'}
            >
              {status === 'saving'
                ? m.employerCompany_savingLabel()
                : m.employerCompany_saveCompanyLabel()}
            </Button>
            {status === 'error' || (status === 'committed' && message) ? (
              <FieldError>{message}</FieldError>
            ) : null}
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
  required = false,
  onChange,
}: {
  id: string;
  label: string;
  domain: string;
  domains: string[];
  value: string;
  required?: boolean;
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
          required={required}
          // Pasting a full URL auto-strips scheme + domain to the bare handle.
          onChange={(event) =>
            onChange(stripSocialHandle(event.currentTarget.value, domains))
          }
        />
      </InputGroup>
    </Field>
  );
}
