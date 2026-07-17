/**
 * Company workspace — Post a job. A dedicated page mirroring the public
 * `/post` form's field set (hosted parity: employment type + seniority,
 * title, workplace, office locations, remote geographic restriction, rich
 * description, salary range) minus the company/contact/plan sections the
 * workspace already knows. Submission creates a HELD DRAFT via the employer
 * jobs API; publishing/checkout stays on the Jobs tab.
 *
 * Apply method: an external URL/email, or the board's built-in applications
 * (native apply — the job's `applicationUrl` stays unset and candidates land
 * in the workspace applicant pipeline).
 */
import { useMemo, useState } from 'react';

import {
  countryOptions,
  fieldLabel,
  getSalaryLexicon,
} from '@cavuno/board/format';
import {
  createFileRoute,
  getRouteApi,
  Link,
  useRouter,
} from '@tanstack/react-router';

import { handleEmployerLoaderError } from '../lib/employer-loader-auth';
import {
  DEFAULT_SALARY_TIMEFRAME,
  isRichTextEmpty,
  normalizeApplicationTarget,
  SALARY_TIMEFRAMES,
  type RemotePermitSelection,
  type SalaryTimeframe,
} from '../lib/post-form';
import { salaryCurrencyOptions } from '../lib/salary-currencies';
import { m } from '../paraglide/messages';
import { createJob, getCompanyWorkspace } from '../server/employers';
import { getRemotePermits } from '../server/queries';
import { useLocationSuggestions } from './-use-location-suggestions';

import type { LocationSuggestionVM } from '@/board/location-suggestion';
import { EmployerCompanyShell } from '@/components/account-shell';
import { PlaceTagsField } from '@/components/place-tags-field';
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
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CreateEmployerJobBody } from '@cavuno/board';

const rootApi = getRouteApi('__root__');

const EMPLOYMENT_TYPES = [
  'full_time',
  'part_time',
  'contract',
  'internship',
  'temporary',
] as const;

const REMOTE_OPTIONS = ['remote', 'hybrid', 'on_site'] as const;

const SENIORITIES = [
  'entry_level',
  'associate',
  'mid_level',
  'senior',
  'lead',
  'principal',
  'director',
  'executive',
] as const;

export const Route = createFileRoute('/employers/companies/$slug/jobs/new')({
  loader: async ({ params }) => {
    try {
      const [workspace, remotePermits] = await Promise.all([
        getCompanyWorkspace({ data: { slug: params.slug } }),
        // Taxonomy garnish — the form falls back to countries-only.
        getRemotePermits().catch(() => null),
      ]);
      return { workspace, remotePermits };
    } catch (error) {
      handleEmployerLoaderError(
        error,
        `/employers/companies/${params.slug}/jobs/new`,
      );
    }
  },
  head: () => ({ meta: [{ title: m.employerCompany_postJobHeading() }] }),
  staticData: { ownsMain: true },
  component: NewJobPage,
});

type OfficeLocationDraft = { key: string; displayName: string };

function NewJobPage() {
  const { workspace, remotePermits } = Route.useLoaderData();
  const { board } = rootApi.useLoaderData();
  const router = useRouter();
  const locale = board.language;
  const company = workspace.membership?.company;
  const officeLocationSuggestions = useLocationSuggestions(locale);

  const [form, setForm] = useState({
    title: '',
    employmentType: 'full_time' as string,
    seniority: null as string | null,
    remoteOption: 'hybrid' as (typeof REMOTE_OPTIONS)[number],
    officeLocations: [] as OfficeLocationDraft[],
    permitSelections: [] as RemotePermitSelection[],
    description: '',
    currency: 'USD',
    salaryTimeframe: DEFAULT_SALARY_TIMEFRAME as SalaryTimeframe,
    salaryMin: '',
    salaryMax: '',
    applyMethod: 'external' as 'external' | 'native',
    applicationTarget: '',
  });
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    description?: boolean;
    officeLocations?: boolean;
    applicationTarget?: boolean;
  }>({});

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const employmentItems = EMPLOYMENT_TYPES.map((value) => ({
    value,
    label: fieldLabel(locale, value) ?? value,
  }));
  const remoteItems = REMOTE_OPTIONS.map((value) => ({
    value,
    label: fieldLabel(locale, value) ?? value,
  }));
  const seniorityItems = SENIORITIES.map((value) => ({
    value,
    label: fieldLabel(locale, value) ?? value,
  }));
  const currencyItems = salaryCurrencyOptions().map(({ value, label }) => ({
    value,
    label,
  }));
  const timeframeWords = getSalaryLexicon(locale).timeframe;
  const timeframeItems = SALARY_TIMEFRAMES.map((value) => ({
    value,
    label: timeframeWords[value],
  }));

  // Same option space as the public /post picker: taxonomy regions/groups
  // first, then the full SDK country lexicon, encoded as `type:value` ids.
  const [permitQuery, setPermitQuery] = useState('');
  const permitChoices = useMemo(() => {
    const groups = (remotePermits?.data ?? [])
      .filter(
        (permit) => permit.type === 'world_region' || permit.type === 'custom',
      )
      .map((permit) => ({
        id: `${permit.type}:${permit.value}`,
        slug: `${permit.type}:${permit.value}`,
        name: permit.label,
        contextLabel: null,
        countryCode: null,
        regionCode: null,
      }));
    const countries = countryOptions(locale).map((country) => ({
      id: `country:${country.code}`,
      slug: `country:${country.code}`,
      name: country.name,
      contextLabel: null,
      countryCode: country.code,
      regionCode: null,
    }));
    return [...groups, ...countries];
  }, [remotePermits, locale]);
  const permitSuggestions = useMemo(() => {
    const query = permitQuery.trim().toLowerCase();
    if (!query) return permitChoices;
    return permitChoices.filter((choice) =>
      choice.name.toLowerCase().includes(query),
    );
  }, [permitChoices, permitQuery]);

  async function submit() {
    const errors = {
      description: isRichTextEmpty(form.description),
      officeLocations:
        form.remoteOption !== 'remote' && form.officeLocations.length === 0,
      applicationTarget:
        form.applyMethod === 'external' &&
        normalizeApplicationTarget(form.applicationTarget) === undefined,
    };
    setFieldErrors(errors);
    if (
      errors.description ||
      errors.officeLocations ||
      errors.applicationTarget
    )
      return;

    const salaryMin = form.salaryMin ? Number(form.salaryMin) : undefined;
    const salaryMax = form.salaryMax ? Number(form.salaryMax) : undefined;
    const salaryRange =
      salaryMin !== undefined &&
      salaryMax !== undefined &&
      Number.isFinite(salaryMin) &&
      Number.isFinite(salaryMax);

    // Native apply omits applicationUrl — the platform stores it as null and
    // candidates apply on the board, landing in the applicant pipeline.
    const body = {
      title: form.title.trim(),
      description: form.description,
      employmentType: form.employmentType,
      remoteOption: form.remoteOption,
      ...(form.seniority ? { seniority: form.seniority } : {}),
      ...(form.officeLocations.length > 0
        ? {
            officeLocations: form.officeLocations.map((location) => ({
              query: location.displayName,
            })),
          }
        : {}),
      ...(form.remoteOption === 'remote'
        ? {
            remotePermits:
              form.permitSelections.length > 0
                ? form.permitSelections.map(({ type, value }) => ({
                    type,
                    value,
                  }))
                : [{ type: 'worldwide', value: 'worldwide' }],
          }
        : {}),
      ...(salaryRange
        ? {
            salaryMin,
            salaryMax,
            salaryCurrency: form.currency,
            salaryTimeframe: form.salaryTimeframe,
          }
        : {}),
      ...(form.applyMethod === 'external'
        ? { applicationUrl: normalizeApplicationTarget(form.applicationTarget) }
        : {}),
    } as CreateEmployerJobBody;

    setStatus('saving');
    setMessage('');
    const result = await createJob({ data: { slug: workspace.slug, body } });
    if (!result.ok) {
      setStatus('error');
      setMessage(result.message);
      return;
    }
    await router.invalidate();
    await router.navigate({
      to: '/employers/companies/$slug',
      params: { slug: workspace.slug },
    });
  }

  return (
    <EmployerCompanyShell
      slug={workspace.slug}
      company={{
        name: company?.name ?? workspace.slug,
        website: company?.website ?? null,
        logoUrl: company?.logoUrl ?? null,
      }}
      active="jobs"
    >
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <header className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {m.employerCompany_postJobHeading()}
          </h1>
          <p className="text-muted-foreground text-sm">
            {m.employerPostJob_subtitleText()}
          </p>
        </header>

        <Card>
          <CardContent>
            <form
              className="grid gap-5"
              onSubmit={(event) => {
                event.preventDefault();
                void submit();
              }}
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="job-employment-type">
                    {m.postJob_employmentTypeLabel()}
                  </FieldLabel>
                  <Select
                    items={employmentItems}
                    value={form.employmentType}
                    onValueChange={(value) =>
                      set('employmentType', (value as string) ?? 'full_time')
                    }
                  >
                    <SelectTrigger id="job-employment-type" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {employmentItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="job-seniority">
                    {m.postJob_seniorityLabel()}
                  </FieldLabel>
                  <Select
                    items={seniorityItems}
                    value={form.seniority}
                    onValueChange={(value) =>
                      set('seniority', (value as string | null) ?? null)
                    }
                  >
                    <SelectTrigger id="job-seniority" className="w-full">
                      <SelectValue
                        placeholder={m.postJob_seniorityPlaceholder()}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {seniorityItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor="job-title">
                  {m.postJob_jobTitleLabel()}
                </FieldLabel>
                <Input
                  id="job-title"
                  required
                  value={form.title}
                  onChange={(event) => set('title', event.target.value)}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="job-remote-option">
                  {m.postJob_remoteOptionLabel()}
                </FieldLabel>
                <Select
                  items={remoteItems}
                  value={form.remoteOption}
                  onValueChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      remoteOption:
                        (value as (typeof REMOTE_OPTIONS)[number] | null) ??
                        'hybrid',
                    }))
                  }
                >
                  <SelectTrigger id="job-remote-option" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {remoteItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field data-invalid={fieldErrors.officeLocations || undefined}>
                <FieldLabel htmlFor="job-office-locations">
                  {m.postJob_officeLocationsLabel()}
                </FieldLabel>
                <PlaceTagsField
                  id="job-office-locations"
                  tags={form.officeLocations.map((location) => ({
                    key: location.key,
                    label: location.displayName,
                  }))}
                  onAddSuggestion={(place: LocationSuggestionVM) =>
                    setForm((prev) =>
                      prev.officeLocations.some(
                        (location) => location.key === place.id,
                      )
                        ? prev
                        : {
                            ...prev,
                            officeLocations: [
                              ...prev.officeLocations,
                              { key: place.id, displayName: place.name },
                            ],
                          },
                    )
                  }
                  onAddFreeText={(text) =>
                    setForm((prev) => ({
                      ...prev,
                      officeLocations: [
                        ...prev.officeLocations,
                        { key: `text:${text}`, displayName: text },
                      ],
                    }))
                  }
                  onRemove={(key) =>
                    setForm((prev) => ({
                      ...prev,
                      officeLocations: prev.officeLocations.filter(
                        (location) => location.key !== key,
                      ),
                    }))
                  }
                  placeholder={m.postJob_officeLocationsPlaceholder()}
                  searchingText={m.locationCombobox_searchingText()}
                  removeAriaLabel={(name) =>
                    m.placeTags_removeAriaLabel({ name })
                  }
                  {...officeLocationSuggestions}
                />
                {form.remoteOption === 'remote' ? (
                  <FieldDescription>
                    {m.postJob_officeLocationsRemoteHelperText()}
                  </FieldDescription>
                ) : null}
                {fieldErrors.officeLocations ? (
                  <FieldError>
                    {m.postJob_officeLocationsRequiredError()}
                  </FieldError>
                ) : null}
              </Field>

              {form.remoteOption === 'remote' ? (
                <Field>
                  <FieldLabel htmlFor="job-remote-permits">
                    {m.postJob_remoteRestrictionLabel()}
                  </FieldLabel>
                  <PlaceTagsField
                    id="job-remote-permits"
                    tags={form.permitSelections.map((selection) => ({
                      key: `${selection.type}:${selection.value}`,
                      label: selection.label,
                    }))}
                    onAddSuggestion={(choice: LocationSuggestionVM) => {
                      const separator = choice.id.indexOf(':');
                      const selection = {
                        type: choice.id.slice(0, separator),
                        value: choice.id.slice(separator + 1),
                        label: choice.name,
                      };
                      setForm((prev) =>
                        prev.permitSelections.some(
                          (entry) =>
                            entry.type === selection.type &&
                            entry.value === selection.value,
                        )
                          ? prev
                          : {
                              ...prev,
                              permitSelections: [
                                ...prev.permitSelections,
                                selection,
                              ],
                            },
                      );
                    }}
                    onRemove={(key) =>
                      setForm((prev) => ({
                        ...prev,
                        permitSelections: prev.permitSelections.filter(
                          (selection) =>
                            `${selection.type}:${selection.value}` !== key,
                        ),
                      }))
                    }
                    suggestions={permitSuggestions}
                    loading={false}
                    onQueryChange={setPermitQuery}
                    placeholder={m.postJob_remoteRestrictionPlaceholder()}
                    searchingText={m.locationCombobox_searchingText()}
                    removeAriaLabel={(name) =>
                      m.placeTags_removeAriaLabel({ name })
                    }
                  />
                  <FieldDescription>
                    {m.postJob_remoteRestrictionHelperText()}
                  </FieldDescription>
                </Field>
              ) : null}

              <Field data-invalid={fieldErrors.description || undefined}>
                <FieldLabel>{m.postJob_descriptionLabel()}</FieldLabel>
                <RichTextEditor
                  value={form.description}
                  onChange={(value) => set('description', value)}
                  ariaLabel={m.postJob_descriptionLabel()}
                />
                {fieldErrors.description ? (
                  <FieldError>
                    {m.postJob_descriptionRequiredError()}
                  </FieldError>
                ) : null}
              </Field>

              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <Field>
                  <FieldLabel htmlFor="job-currency">
                    {m.postJob_currencyLabel()}
                  </FieldLabel>
                  <Select
                    items={currencyItems}
                    value={form.currency}
                    onValueChange={(value) =>
                      set('currency', (value as string) ?? 'USD')
                    }
                  >
                    <SelectTrigger id="job-currency" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencyItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="job-salary-timeframe">
                    {m.postJob_salaryTimeframeLabel()}
                  </FieldLabel>
                  <Select
                    items={timeframeItems}
                    value={form.salaryTimeframe}
                    onValueChange={(value) =>
                      set(
                        'salaryTimeframe',
                        (value as SalaryTimeframe | null) ??
                          DEFAULT_SALARY_TIMEFRAME,
                      )
                    }
                  >
                    <SelectTrigger id="job-salary-timeframe" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeframeItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="job-salary-min">
                    {m.postJob_salaryMinLabel()}
                  </FieldLabel>
                  <Input
                    id="job-salary-min"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={form.salaryMin}
                    onChange={(event) => set('salaryMin', event.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="job-salary-max">
                    {m.postJob_salaryMaxLabel()}
                  </FieldLabel>
                  <Input
                    id="job-salary-max"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={form.salaryMax}
                    onChange={(event) => set('salaryMax', event.target.value)}
                  />
                </Field>
              </div>

              <Field>
                <FieldLabel>{m.employerPostJob_applyMethodLabel()}</FieldLabel>
                <RadioGroup
                  value={form.applyMethod}
                  onValueChange={(value) =>
                    set(
                      'applyMethod',
                      value === 'native' ? 'native' : 'external',
                    )
                  }
                  className="gap-2"
                >
                  <Label className="flex items-start gap-2 font-normal">
                    <RadioGroupItem value="native" className="mt-0.5" />
                    <span className="grid gap-0.5">
                      <span className="font-medium">
                        {m.employerPostJob_applyNativeLabel()}
                      </span>
                      <span className="text-muted-foreground text-sm">
                        {m.employerPostJob_applyNativeHint()}
                      </span>
                    </span>
                  </Label>
                  <Label className="flex items-start gap-2 font-normal">
                    <RadioGroupItem value="external" className="mt-0.5" />
                    <span className="font-medium">
                      {m.employerPostJob_applyExternalLabel()}
                    </span>
                  </Label>
                </RadioGroup>
              </Field>

              {form.applyMethod === 'external' ? (
                <Field
                  data-invalid={fieldErrors.applicationTarget || undefined}
                >
                  <FieldLabel htmlFor="job-application-target">
                    {m.employerCompany_applyUrlLabel()}
                  </FieldLabel>
                  <Input
                    id="job-application-target"
                    value={form.applicationTarget}
                    placeholder={m.employerCompany_applyUrlPlaceholder()}
                    onChange={(event) =>
                      set('applicationTarget', event.target.value)
                    }
                  />
                  {fieldErrors.applicationTarget ? (
                    <FieldError>
                      {m.employerPostJob_applyTargetRequiredError()}
                    </FieldError>
                  ) : null}
                </Field>
              ) : null}

              {/* In-page form: primary action left-aligned, in reading flow. */}
              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" disabled={status === 'saving'}>
                  {status === 'saving'
                    ? m.employerCompany_creatingLabel()
                    : m.employerCompany_createDraftLabel()}
                </Button>
                <Link
                  to="/employers/companies/$slug"
                  params={{ slug: workspace.slug }}
                  className={buttonVariants({ variant: 'ghost' })}
                >
                  {m.employerOnboarding_cancelLabel()}
                </Link>
                {status === 'error' ? <FieldError>{message}</FieldError> : null}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </EmployerCompanyShell>
  );
}
