/**
 * Company workspace — Post a job. One-page wizard mirroring the hosted
 * employer post flow: the job details (public /post field set) plus the
 * billing choice — an existing credit or a new plan — submit together.
 * A credit (or free plan) publishes immediately; a paid plan redirects to
 * checkout; an invoice-only plan reports the emailed invoice. The job is
 * created first, so a failed payment still leaves it recoverable from the
 * jobs list.
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
import {
  checkoutJob,
  createJob,
  getCompanyWorkspace,
} from '../server/employers';
import { getRemotePermits } from '../server/queries';
import { useLocationSuggestions } from './-use-location-suggestions';

import type { LocationSuggestionVM } from '@/board/location-suggestion';
import { planFeatureLines } from '@/board/plan-view-model';
import { EmployerCompanyShell } from '@/components/account-shell';
import { PlaceTagsField } from '@/components/place-tags-field';
import { RichTextEditor } from '@/components/rich-text-editor';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldTitle,
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

type PermitType = NonNullable<
  CreateEmployerJobBody['remotePermits']
>[number]['type'];

function formatPrice(
  language: string,
  currency: string | undefined,
  amountCents: number | undefined,
) {
  if (currency === undefined || amountCents === undefined) return '';
  if (amountCents === 0) return m.employerCompany_freeLabel();
  return new Intl.NumberFormat(language, {
    style: 'currency',
    currency: currency.toUpperCase(),
    maximumFractionDigits: amountCents % 100 === 0 ? 0 : 2,
  }).format(amountCents / 100);
}

function NewJobPage() {
  const { workspace, remotePermits } = Route.useLoaderData();
  const { board } = rootApi.useLoaderData();
  const router = useRouter();
  const locale = board.language;
  const company = workspace.membership?.company;
  const billingOptions = workspace.billingOptions.data;
  const plans = workspace.plans;
  const canPublish = billingOptions.length > 0 || plans.length > 0;
  const officeLocationSuggestions = useLocationSuggestions(locale);

  const [form, setForm] = useState({
    title: '',
    employmentType: 'full_time' as (typeof EMPLOYMENT_TYPES)[number],
    seniority: null as (typeof SENIORITIES)[number] | null,
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
  /** `option:{id}` (existing credit) or `plan:{planId}` (new purchase). */
  const [selectedBilling, setSelectedBilling] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    description?: boolean;
    officeLocations?: boolean;
    applicationTarget?: boolean;
    billing?: boolean;
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
      billing: canPublish && selectedBilling === null,
    };
    setFieldErrors(errors);
    if (
      errors.description ||
      errors.officeLocations ||
      errors.applicationTarget ||
      errors.billing
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
                    // Selections come from the taxonomy/lexicon choices, so
                    // the runtime values are always canonical permit types.
                    type: type as PermitType,
                    value,
                  }))
                : [{ type: 'worldwide' as const, value: 'worldwide' }],
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
    } satisfies CreateEmployerJobBody;

    setStatus('saving');
    setMessage('');
    setNotice('');
    const result = await createJob({ data: { slug: workspace.slug, body } });
    if (!result.ok) {
      setStatus('error');
      setMessage(result.message);
      return;
    }

    // The hosted flow: post and pay together. A board with no plans and no
    // credits can only hold the job as a draft in the list.
    if (!selectedBilling) {
      await router.invalidate();
      await router.navigate({
        to: '/employers/companies/$slug',
        params: { slug: workspace.slug },
      });
      return;
    }

    const option = billingOptions.find(
      (candidate) => `option:${candidate.id}` === selectedBilling,
    );
    const billing = option
      ? { type: option.type, planId: option.planId, id: option.id }
      : {
          type: 'new' as const,
          planId: selectedBilling.replace(/^plan:/, ''),
        };

    const checkout = await checkoutJob({
      data: { slug: workspace.slug, id: result.data.id, body: { billing } },
    });
    if (!checkout.ok) {
      // The job exists as a draft — surface the payment failure and let the
      // jobs list be the retry surface.
      setStatus('error');
      setMessage(checkout.message);
      return;
    }
    const outcome = checkout.data;
    if (outcome.status === 'checkout' && outcome.checkoutUrl) {
      window.location.assign(outcome.checkoutUrl);
      return;
    }
    if (outcome.status === 'invoice_sent') {
      setStatus('idle');
      setNotice(m.employerCompany_invoiceSentText());
      await router.invalidate();
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

        <form
          className="space-y-6"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <Card>
            <CardContent className="grid gap-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="job-employment-type">
                    {m.postJob_employmentTypeLabel()}
                  </FieldLabel>
                  <Select
                    items={employmentItems}
                    value={form.employmentType}
                    onValueChange={(value) =>
                      set(
                        'employmentType',
                        (value as (typeof EMPLOYMENT_TYPES)[number] | null) ??
                          'full_time',
                      )
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
                      set(
                        'seniority',
                        (value as (typeof SENIORITIES)[number] | null) ?? null,
                      )
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <h2>{m.employerCompany_choosePlanHeading()}</h2>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {canPublish ? (
                <Field data-invalid={fieldErrors.billing || undefined}>
                  <RadioGroup
                    value={selectedBilling}
                    onValueChange={(value) =>
                      setSelectedBilling((value as string | null) ?? null)
                    }
                    className="gap-4"
                    aria-label={m.employerCompany_choosePlanHeading()}
                  >
                    {billingOptions.length > 0 ? (
                      <div className="grid gap-2">
                        <p className="text-muted-foreground text-xs font-medium">
                          {m.employerCompany_reusableCreditsLabel()}
                        </p>
                        {billingOptions.map((option) => (
                          <FieldLabel
                            key={option.id}
                            htmlFor={`billing-option-${option.id}`}
                            className="hover:bg-muted cursor-pointer transition-colors"
                          >
                            <Field orientation="horizontal">
                              <RadioGroupItem
                                id={`billing-option-${option.id}`}
                                value={`option:${option.id}`}
                                aria-label={option.planName}
                              />
                              <FieldContent>
                                <FieldTitle>{option.planName}</FieldTitle>
                              </FieldContent>
                              <span className="text-muted-foreground text-sm">
                                {m.employerCompany_creditsRemaining({
                                  count: option.jobsRemaining,
                                })}
                              </span>
                            </Field>
                          </FieldLabel>
                        ))}
                      </div>
                    ) : null}
                    {plans.length > 0 ? (
                      <div className="grid gap-2">
                        <p className="text-muted-foreground text-xs font-medium">
                          {m.employerCompany_buyPlanLabel()}
                        </p>
                        {plans.map((plan) => {
                          const price =
                            plan.prices.find(
                              (candidate) => candidate.isActive,
                            ) ?? plan.prices[0];
                          const features = planFeatureLines(plan);
                          return (
                            <FieldLabel
                              key={plan.id}
                              htmlFor={`billing-plan-${plan.id}`}
                              className="hover:bg-muted cursor-pointer transition-colors"
                            >
                              <Field orientation="horizontal">
                                <RadioGroupItem
                                  id={`billing-plan-${plan.id}`}
                                  value={`plan:${plan.id}`}
                                  aria-label={plan.name}
                                />
                                <FieldContent>
                                  <FieldTitle>
                                    <span className="flex flex-wrap items-center gap-2">
                                      {plan.name}
                                      {plan.isRecommended ? (
                                        <Badge variant="secondary">
                                          {m.postJob_recommendedLabel()}
                                        </Badge>
                                      ) : null}
                                    </span>
                                  </FieldTitle>
                                  {plan.description ? (
                                    <FieldDescription>
                                      {plan.description}
                                    </FieldDescription>
                                  ) : null}
                                  {features.length > 0 ? (
                                    <FieldDescription>
                                      {features.join(' · ')}
                                    </FieldDescription>
                                  ) : null}
                                </FieldContent>
                                <span className="text-foreground font-medium">
                                  {formatPrice(
                                    locale,
                                    price?.currency,
                                    price?.amountCents,
                                  )}
                                </span>
                              </Field>
                            </FieldLabel>
                          );
                        })}
                      </div>
                    ) : null}
                  </RadioGroup>
                  {fieldErrors.billing ? (
                    <FieldError>
                      {m.employerPostJob_billingRequiredError()}
                    </FieldError>
                  ) : null}
                </Field>
              ) : (
                <p className="text-muted-foreground text-sm">
                  {m.employerCompany_noPlansText()}
                </p>
              )}
            </CardContent>
          </Card>

          {/* In-page form: primary action left-aligned, in reading flow. */}
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={status === 'saving'}>
              {status === 'saving'
                ? m.postJob_submittingLabel()
                : canPublish
                  ? m.postJob_submitButtonLabel()
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
            {notice ? (
              <p role="status" className="text-sm">
                {notice}
              </p>
            ) : null}
          </div>
        </form>
      </div>
    </EmployerCompanyShell>
  );
}
