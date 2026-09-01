'use client';

/**
 * The shared employer job form — used by both "Post a job" (create) and the
 * per-job "Edit job" page. It owns the role field set plus, when the job can be
 * published (a draft with credits/plans available), the billing picker and
 * checkout step. The route decides the mode and passes the workspace data; the
 * form owns the create/update + checkout orchestration so the two surfaces
 * never drift.
 */
import { useMemo, useState } from 'react';

import { countryOptions } from '@cavuno/board/format';
import { useRouter } from '@tanstack/react-router';

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
import { checkoutJob, createJob, updateJob } from '../server/employers';

import {
  narrowOptions,
  resolveJobFormConstraints,
  type JobFormConstraints,
  type JobFormSource,
} from '@/board/job-form';
import type { LocationSuggestionVM } from '@/board/location-suggestion';
import { planFeatureLines } from '@/board/plan-view-model';
import type { LocationSuggestionState } from '@/components/location-combobox';
import { PlaceTagsField } from '@/components/place-tags-field';
import { RichTextEditor } from '@/components/rich-text-editor';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { boardErrorMessage } from '@/lib/board-error-message';
import { enumLabel, salaryTimeframeLabel } from '@/lib/enum-labels';
import type {
  CreateEmployerJobBody,
  EmployerBillingOption,
  EmployerJob,
  JobPostingPlan,
  RemotePermitTaxonomyEntry,
  UpdateEmployerJobBody,
} from '@cavuno/board';

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

/**
 * The board's job-form constraints, checked against the draft. Returns the
 * viewer-locale message for the first violation, or `''` when clean —
 * The platform is the authority and
 * will 400 anything this misses.
 */
function jobFormConstraintError(
  form: {
    salaryMin: string;
    salaryMax: string;
    seniority: string | null;
    officeLocations: OfficeLocationDraft[];
    employmentType: string;
    remoteOption: string;
    currency: string;
  },
  jobForm: JobFormConstraints,
): string {
  // An EDIT opens with the job's stored values, which predate any narrowing
  // the operator has since applied — so a job saved as full_time / hybrid /
  // USD can sit in a form whose pickers now offer none of those. Nothing
  // downstream catches it: the employer job route runs no server-side
  // constraint check (only public submission does), so an unchecked save
  // silently stores a value the board disallows.
  const disallowed = (
    [
      [jobForm.employmentType.allowedOptions, form.employmentType],
      [jobForm.workArrangement.allowedOptions, form.remoteOption],
    ] as const
  ).some(([allowed, value]) => allowed && !allowed.includes(value));
  if (disallowed) return m.jobForm_optionNotAllowedError();
  if (
    jobForm.salary.visible &&
    jobForm.salary.allowedCurrencies &&
    !jobForm.salary.allowedCurrencies.includes(form.currency)
  ) {
    return m.jobForm_currencyNotAllowedError({
      currencies: jobForm.salary.allowedCurrencies.join(', '),
    });
  }
  const allowedCountries = jobForm.location.allowedCountries;
  if (jobForm.location.visible && allowedCountries) {
    // Same rule as the platform collector: only a location that HAS a
    // country code outside the list is a violation. The picker refuses new
    // ones inline; this catches a stored location on a board that narrowed
    // its list after the job was posted.
    const offending = form.officeLocations.some(
      (location) =>
        location.countryCode &&
        !allowedCountries.includes(location.countryCode),
    );
    if (offending) {
      return m.jobForm_officeLocationCountryNotAllowedError({
        countries: allowedCountries.join(', '),
      });
    }
  }
  if (
    jobForm.seniority.visible &&
    jobForm.seniority.required &&
    !form.seniority
  ) {
    return m.jobForm_seniorityRequiredError();
  }
  if (!jobForm.salary.visible) return '';
  const values = [form.salaryMin, form.salaryMax]
    .filter((entry) => entry !== '')
    .map(Number)
    .filter((value) => Number.isFinite(value));
  if (jobForm.salary.required && values.length < 2) {
    return m.jobForm_salaryRequiredError();
  }
  const { minBound, maxBound } = jobForm.salary;
  if (minBound !== null && values.some((value) => value < minBound)) {
    return m.jobForm_salaryBelowMinError({ min: minBound });
  }
  if (maxBound !== null && values.some((value) => value > maxBound)) {
    return m.jobForm_salaryAboveMaxError({ max: maxBound });
  }
  return '';
}

function clientFieldErrorMessage(errors: {
  description: boolean;
  officeLocations: boolean;
  applicationTarget: boolean;
  billing: boolean;
}): string | null {
  if (errors.description) return m.postJob_descriptionRequiredError();
  if (errors.officeLocations) return m.postJob_officeLocationsRequiredError();
  if (errors.applicationTarget)
    return m.employerPostJob_applyTargetRequiredError();
  if (errors.billing) return m.employerPostJob_billingRequiredError();
  return null;
}

/**
 * Keep the form's own default when the board still allows it, and only fall
 * back to the first allowed value when it does not. Taking `allowed[0]`
 * unconditionally would silently change the default on the ~165 boards that
 * configure no restriction at all.
 */
function preferredDefault<T extends string>(
  preferred: T,
  allowed: readonly T[],
): T {
  return allowed.includes(preferred) ? preferred : (allowed[0] ?? preferred);
}

type EmploymentTypeOption = (typeof EMPLOYMENT_TYPES)[number];
type RemoteOptionChoice = (typeof REMOTE_OPTIONS)[number];
type SeniorityOption = (typeof SENIORITIES)[number];

type PermitType = NonNullable<
  CreateEmployerJobBody['remotePermits']
>[number]['type'];

type OfficeLocationDraft = {
  key: string;
  displayName: string;
  /**
   * ISO country code when the entry came from a resolved place suggestion,
   * `null` for free text — the API resolves that through Mapbox server-side,
   * so the country is not knowable here, and the board's country lock treats
   * an unknown country the same way the platform collector does: it passes.
   */
  countryCode: string | null;
};
type JobPermitSelection = RemotePermitSelection & { type: PermitType };
type ApplyMethod = 'external' | 'native';

function isPermitType(value: string): value is PermitType {
  return value !== 'worldwide';
}

type EmployerJobFormState = {
  title: string;
  employmentType: EmploymentTypeOption;
  seniority: SeniorityOption | null;
  remoteOption: RemoteOptionChoice;
  officeLocations: OfficeLocationDraft[];
  permitSelections: JobPermitSelection[];
  description: string;
  currency: string;
  salaryTimeframe: SalaryTimeframe;
  salaryMin: string;
  salaryMax: string;
  applyMethod: ApplyMethod;
  applicationTarget: string;
};

export type EmployerJobFormMode =
  | { kind: 'create' }
  | { kind: 'edit'; jobId: string; status: EmployerJob['status'] };

export type EmployerJobFormProps = {
  slug: string;
  locale: string;
  remotePermits: RemotePermitTaxonomyEntry[] | null;
  plans: JobPostingPlan[];
  billingOptions: EmployerBillingOption[];
  officeLocationSuggestions: LocationSuggestionState;
  mode: EmployerJobFormMode;
  /** Built-in field visibility from `board.context().jobForm`. */
  jobForm?: JobFormSource | null;
  /** Prefill for edit mode. */
  job?: EmployerJob;
  dependencies?: EmployerJobFormDependencies;
};

export interface EmployerJobFormDependencies {
  createJob: (
    input: Parameters<typeof createJob>[0],
  ) => ReturnType<typeof createJob>;
  updateJob: (
    input: Parameters<typeof updateJob>[0],
  ) => ReturnType<typeof updateJob>;
  checkoutJob: (
    input: Parameters<typeof checkoutJob>[0],
  ) => ReturnType<typeof checkoutJob>;
  invalidate: () => Promise<void>;
  navigate: (options: {
    to: '/employers/companies/$slug';
    params: { slug: string };
  }) => Promise<void>;
}

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

function initialForm(
  job: EmployerJob | undefined,
  countryName: (code: string) => string,
  // A board narrowed to e.g. remote-only, contract-only or EUR-only would
  // otherwise open the form pre-filled with a value it rejects, and the
  // employer would never think to change it.
  defaults: {
    employmentType: EmploymentTypeOption;
    remoteOption: RemoteOptionChoice;
    currency: string;
  },
): EmployerJobFormState {
  if (!job) {
    return {
      title: '',
      employmentType: defaults.employmentType,
      seniority: null,
      remoteOption: defaults.remoteOption,
      officeLocations: [],
      permitSelections: [],
      description: '',
      currency: defaults.currency,
      salaryTimeframe: DEFAULT_SALARY_TIMEFRAME,
      salaryMin: '',
      salaryMax: '',
      applyMethod: 'external',
      applicationTarget: '',
    };
  }

  const officeLocations: OfficeLocationDraft[] = job.officeLocations
    .map((location, index) => ({
      key: `existing:${index}`,
      displayName:
        location.displayName ??
        [location.city, location.region, location.country]
          .filter(Boolean)
          .join(', '),
      // Carried so an EDIT is checked too: an operator can narrow
      // `allowedCountries` after a job was posted, and hosted's employer
      // form (whose picker has always kept the country) blocks the save.
      countryCode: location.countryCode,
    }))
    .filter((location) => location.displayName.length > 0);

  // A stored `worldwide` permit is the form's "no selection" default, so it
  // never becomes an editable tag.
  const permitSelections: JobPermitSelection[] = job.remotePermits
    .filter((permit) => permit.type !== 'worldwide')
    .filter((permit): permit is RemotePermitSelection & { type: PermitType } =>
      isPermitType(permit.type),
    )
    .map((permit) => ({
      type: permit.type,
      value: permit.value,
      label:
        permit.type === 'country' ? countryName(permit.value) : permit.value,
    }));

  const applicationTarget = job.applicationUrl
    ? job.applicationUrl.replace(/^mailto:/i, '')
    : '';
  const seniority =
    SENIORITIES.find((value) => value === job.seniority) ?? null;

  return {
    title: job.title,
    employmentType:
      EMPLOYMENT_TYPES.find((value) => value === job.employmentType) ??
      defaults.employmentType,
    seniority,
    remoteOption:
      REMOTE_OPTIONS.find((value) => value === job.remoteOption) ??
      defaults.remoteOption,
    officeLocations,
    permitSelections,
    description: job.description ?? '',
    currency: job.salaryCurrency ?? 'USD',
    salaryTimeframe:
      SALARY_TIMEFRAMES.find((value) => value === job.salaryTimeframe) ??
      DEFAULT_SALARY_TIMEFRAME,
    salaryMin: job.salaryMin != null ? String(job.salaryMin) : '',
    salaryMax: job.salaryMax != null ? String(job.salaryMax) : '',
    applyMethod: job.applicationUrl ? 'external' : 'native',
    applicationTarget,
  };
}

export function EmployerJobForm({
  slug,
  locale,
  remotePermits,
  plans,
  billingOptions,
  officeLocationSuggestions,
  mode,
  job,
  jobForm: jobFormSource,
  dependencies,
}: EmployerJobFormProps) {
  const jobForm = resolveJobFormConstraints(jobFormSource);
  // Narrow every picker to what the board accepts. The platform 400s a job
  // carrying a disallowed value (`JOBS_CONSTRAINT_VIOLATION`), so an
  // un-narrowed picker offers options the save will reject.
  const allowedEmploymentTypes = narrowOptions(
    EMPLOYMENT_TYPES,
    jobForm.employmentType.allowedOptions,
  );
  const allowedRemoteOptions = narrowOptions(
    REMOTE_OPTIONS,
    jobForm.workArrangement.allowedOptions,
  );
  const allowedSeniorities = narrowOptions(
    SENIORITIES,
    jobForm.seniority.allowedOptions,
  );
  const currencyOptions = salaryCurrencyOptions(
    jobForm.salary.allowedCurrencies,
  );
  const router = useRouter();
  const actions: EmployerJobFormDependencies = dependencies ?? {
    createJob,
    updateJob,
    checkoutJob,
    invalidate: () => router.invalidate(),
    navigate: (options) => router.navigate(options),
  };
  const countryChoices = useMemo(() => countryOptions(locale), [locale]);
  const countryName = useMemo(() => {
    const byCode = new Map<string, string>(
      countryChoices.map((country) => [country.code, country.name]),
    );
    return (code: string) => byCode.get(code) ?? code;
  }, [countryChoices]);

  // The billing step shows on create, and on a draft edit (a draft is the only
  // status that still needs publishing). Published/expired/archived jobs edit
  // their details only.
  const isDraftEdit = mode.kind === 'edit' && mode.status === 'draft';
  const showBilling = mode.kind === 'create' || isDraftEdit;
  const canPublish = billingOptions.length > 0 || plans.length > 0;
  const billingRequired = mode.kind === 'create' && canPublish;

  const [form, setForm] = useState(() =>
    initialForm(job, countryName, {
      employmentType: preferredDefault('full_time', allowedEmploymentTypes),
      remoteOption: preferredDefault('hybrid', allowedRemoteOptions),
      currency: preferredDefault(
        'USD',
        currencyOptions.map(({ value }) => value),
      ),
    }),
  );
  /** `option:{id}` (existing credit) or `plan:{planId}` (new purchase). */
  const [selectedBilling, setSelectedBilling] = useState<string | null>(null);
  const [status, setStatus] = useState<
    'idle' | 'saving' | 'error' | 'committed'
  >('idle');
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [committedCheckoutJobId, setCommittedCheckoutJobId] = useState<
    string | null
  >(null);
  const [fieldErrors, setFieldErrors] = useState<{
    description?: boolean;
    officeLocations?: boolean;
    /** A picked location outside the board's country list (distinct from
     *  `officeLocations`, which means "none added"). */
    officeLocationCountry?: boolean;
    applicationTarget?: boolean;
    billing?: boolean;
  }>({});

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const employmentItems = allowedEmploymentTypes.map((value) => ({
    value,
    label: enumLabel(value) ?? value,
  }));
  const remoteItems = allowedRemoteOptions.map((value) => ({
    value,
    label: enumLabel(value) ?? value,
  }));
  const seniorityItems = allowedSeniorities.map((value) => ({
    value,
    label: enumLabel(value) ?? value,
  }));
  const currencyItems = currencyOptions.map(({ value, label }) => ({
    value,
    label,
  }));
  const timeframeLabel = (value: string) =>
    salaryTimeframeLabel(value) ?? value;
  const timeframeItems = SALARY_TIMEFRAMES.map((value) => ({
    value,
    label: timeframeLabel(value),
  }));

  const [permitQuery, setPermitQuery] = useState('');
  const permitChoices = useMemo(() => {
    const groups = (remotePermits ?? [])
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
    const countries = countryChoices.map((country) => ({
      id: `country:${country.code}`,
      slug: `country:${country.code}`,
      name: country.name,
      contextLabel: null,
      countryCode: country.code,
      regionCode: null,
    }));
    return [...groups, ...countries];
  }, [remotePermits, countryChoices]);
  const permitSuggestions = useMemo(() => {
    const query = permitQuery.trim().toLowerCase();
    if (!query) return permitChoices;
    return permitChoices.filter((choice) =>
      choice.name.toLowerCase().includes(query),
    );
  }, [permitChoices, permitQuery]);

  function buildBody() {
    const salaryMin = form.salaryMin ? Number(form.salaryMin) : undefined;
    const salaryMax = form.salaryMax ? Number(form.salaryMax) : undefined;
    const salaryRange =
      salaryMin !== undefined &&
      salaryMax !== undefined &&
      Number.isFinite(salaryMin) &&
      Number.isFinite(salaryMax);

    const body: CreateEmployerJobBody = {
      title: form.title.trim(),
      description: form.description,
      employmentType: form.employmentType,
      remoteOption: form.remoteOption,
    };
    if (jobForm.seniority.visible && form.seniority)
      body.seniority = form.seniority;
    if (jobForm.location.visible && form.officeLocations.length > 0) {
      body.officeLocations = form.officeLocations.map((location) => ({
        query: location.displayName,
      }));
    }
    if (form.remoteOption === 'remote') {
      body.remotePermits =
        form.permitSelections.length > 0
          ? form.permitSelections.map(({ type, value }) => ({ type, value }))
          : [{ type: 'worldwide', value: 'worldwide' }];
    }
    if (jobForm.salary.visible && salaryRange) {
      body.salaryMin = salaryMin;
      body.salaryMax = salaryMax;
      body.salaryCurrency = form.currency;
      body.salaryTimeframe = form.salaryTimeframe;
    }
    return body;
  }

  /**
   * Edit-only: both bounds deliberately emptied on a job that HAS a salary
   * means "withdraw it" (4.1.0 PATCH null-clears — omitting would silently
   * keep the old figures forever). One bound emptied is ambiguous and stays
   * merge-patch. Lives outside `buildBody` so the CREATE body type never
   * carries the null variant.
   */
  function salaryClear() {
    if (!jobForm.salary.visible) return {};
    if (mode.kind !== 'edit') return {};
    if (form.salaryMin || form.salaryMax) return {};
    if (job?.salaryMin == null && job?.salaryMax == null) return {};
    return {
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: null,
      salaryTimeframe: null,
    };
  }

  async function runCheckout(jobId: string) {
    setStatus('saving');
    setMessage('');
    const option = billingOptions.find(
      (candidate) => `option:${candidate.id}` === selectedBilling,
    );
    const billing = option
      ? { type: option.type, planId: option.planId, id: option.id }
      : {
          type: 'new' as const,
          planId: (selectedBilling ?? '').replace(/^plan:/, ''),
        };

    let checkout: Awaited<ReturnType<typeof actions.checkoutJob>>;
    try {
      checkout = await actions.checkoutJob({
        data: { slug, id: jobId, body: { billing } },
      });
    } catch {
      setStatus('committed');
      setMessage(m.employerCompany_genericError());
      return;
    }
    if (!checkout.ok) {
      setStatus('committed');
      setMessage(boardErrorMessage(checkout));
      return;
    }
    const outcome = checkout.data;
    if (outcome.status === 'checkout' && outcome.checkoutUrl) {
      window.location.assign(outcome.checkoutUrl);
      return;
    }
    if (outcome.status === 'invoice_sent') {
      setCommittedCheckoutJobId(null);
      setStatus('committed');
      setNotice(m.employerCompany_invoiceSentText());
      try {
        await actions.invalidate();
      } catch {
        setNotice(
          `${m.employerCompany_invoiceSentText()} ${m.employerCompany_reconciliationError()}`,
        );
      }
      return;
    }
    setCommittedCheckoutJobId(null);
    await goToList();
  }

  async function goToList() {
    setStatus('committed');
    try {
      await actions.invalidate();
      await actions.navigate({
        to: '/employers/companies/$slug',
        params: { slug },
      });
    } catch {
      setNotice(m.employerCompany_reconciliationError());
    }
  }

  async function submit() {
    if (status === 'saving' || status === 'committed') return;
    const applyExternal =
      form.applyMethod === 'external' &&
      normalizeApplicationTarget(form.applicationTarget) === undefined;
    const errors = {
      description: isRichTextEmpty(form.description),
      officeLocations:
        jobForm.location.visible &&
        form.remoteOption !== 'remote' &&
        form.officeLocations.length === 0,
      applicationTarget: applyExternal,
      billing: billingRequired && selectedBilling === null,
    };
    setFieldErrors(errors);
    const fieldMessage = clientFieldErrorMessage(errors);
    if (fieldMessage) {
      // Field flags alone leave status idle, so a below-the-fold office
      // miss looks like a dead Post job button (live CJJ hybrid no-op).
      setStatus('error');
      setMessage(fieldMessage);
      return;
    }

    // Board-configured requirements. The platform enforces these on save
    // (the API rejects it with a 400) with an English wire
    // sentence; catching them here gives the employer a localized message
    // before the round trip.
    const constraintError = jobFormConstraintError(form, jobForm);
    if (constraintError) {
      // `message` only renders under `status === 'error'` — setting it alone
      // leaves the employer with a silently dead submit button.
      setStatus('error');
      setMessage(constraintError);
      return;
    }

    // Native apply clears the stored URL (create omits it; edit must send null
    // to switch a previously-external job back to on-board applications).
    const applicationUrl =
      form.applyMethod === 'external'
        ? normalizeApplicationTarget(form.applicationTarget)
        : undefined;

    setStatus('saving');
    setMessage('');
    setNotice('');

    if (mode.kind === 'create') {
      const body = buildBody();
      if (applicationUrl) body.applicationUrl = applicationUrl;
      let result: Awaited<ReturnType<typeof actions.createJob>>;
      try {
        result = await actions.createJob({ data: { slug, body } });
      } catch {
        setStatus('error');
        setMessage(m.employerCompany_genericError());
        return;
      }
      if (!result.ok) {
        setStatus('error');
        setMessage(boardErrorMessage(result));
        return;
      }
      if (!selectedBilling) {
        await goToList();
        return;
      }
      setCommittedCheckoutJobId(result.data.id);
      await runCheckout(result.data.id);
      return;
    }

    // Edit.
    const body = {
      ...buildBody(),
      ...salaryClear(),
      applicationUrl: applicationUrl ?? null,
    } satisfies UpdateEmployerJobBody;
    let result: Awaited<ReturnType<typeof actions.updateJob>>;
    try {
      result = await actions.updateJob({
        data: { slug, id: mode.jobId, body },
      });
    } catch {
      setStatus('error');
      setMessage(m.employerCompany_genericError());
      return;
    }
    if (!result.ok) {
      setStatus('error');
      setMessage(boardErrorMessage(result));
      return;
    }
    if (isDraftEdit && selectedBilling) {
      setCommittedCheckoutJobId(mode.jobId);
      await runCheckout(mode.jobId);
      return;
    }
    await goToList();
  }

  const submitLabel =
    status === 'saving'
      ? mode.kind === 'create'
        ? m.postJob_submittingLabel()
        : m.employerEditJob_savingLabel()
      : mode.kind === 'create'
        ? canPublish
          ? m.postJob_submitButtonLabel()
          : m.employerCompany_createDraftLabel()
        : isDraftEdit && selectedBilling
          ? m.employerEditJob_publishSaveLabel()
          : m.employerEditJob_saveLabel();

  return (
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
                onValueChange={(value: EmploymentTypeOption | null) =>
                  set('employmentType', value ?? 'full_time')
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
            {jobForm.seniority.visible ? (
              <Field>
                <FieldLabel htmlFor="job-seniority">
                  {m.postJob_seniorityLabel()}
                </FieldLabel>
                <Select
                  items={seniorityItems}
                  value={form.seniority}
                  onValueChange={(value: SeniorityOption | null) =>
                    set('seniority', value ?? null)
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
            ) : null}
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
              onValueChange={(value: RemoteOptionChoice | null) =>
                setForm((prev) => ({
                  ...prev,
                  remoteOption: value ?? 'hybrid',
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

          {jobForm.location.visible ? (
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
                onAddSuggestion={(place: LocationSuggestionVM) => {
                  // Mirror the platform collector exactly: reject only a
                  // location that HAS a country code outside the board's
                  // list. The picker already resolves one — the form simply
                  // threw it away, so the board's country lock could never
                  // fire on an employer-posted job.
                  const allowed = jobForm.location.allowedCountries;
                  if (
                    allowed &&
                    place.countryCode &&
                    !allowed.includes(place.countryCode)
                  ) {
                    setFieldErrors((prev) => ({
                      ...prev,
                      officeLocationCountry: true,
                    }));
                    return;
                  }
                  setFieldErrors((prev) => ({
                    ...prev,
                    officeLocationCountry: false,
                  }));
                  setForm((prev) =>
                    prev.officeLocations.some(
                      (location) => location.key === place.id,
                    )
                      ? prev
                      : {
                          ...prev,
                          officeLocations: [
                            ...prev.officeLocations,
                            {
                              key: place.id,
                              displayName: place.name,
                              countryCode: place.countryCode,
                            },
                          ],
                        },
                  );
                }}
                onAddFreeText={(text) => {
                  // Free text carries no country code. On the PUBLIC form
                  // that is fine — the server resolves it and rejects a
                  // disallowed country. This route has no such check, so
                  // accepting unverifiable text here would be a hole in the
                  // very lock this form is enforcing.
                  if (jobForm.location.allowedCountries) {
                    setFieldErrors((prev) => ({
                      ...prev,
                      officeLocationCountry: true,
                    }));
                    return;
                  }
                  setForm((prev) => ({
                    ...prev,
                    officeLocations: [
                      ...prev.officeLocations,
                      {
                        key: `text:${text}`,
                        displayName: text,
                        countryCode: null,
                      },
                    ],
                  }));
                }}
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
              {fieldErrors.officeLocationCountry &&
              jobForm.location.allowedCountries ? (
                <FieldError>
                  {m.jobForm_officeLocationCountryNotAllowedError({
                    countries: jobForm.location.allowedCountries.join(', '),
                  })}
                </FieldError>
              ) : null}
              {fieldErrors.officeLocations ? (
                <FieldError>
                  {m.postJob_officeLocationsRequiredError()}
                </FieldError>
              ) : null}
            </Field>
          ) : null}

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
                  if (separator < 0) return;
                  const type = choice.id.slice(0, separator);
                  if (!isPermitType(type)) return;
                  const selection: JobPermitSelection = {
                    type,
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
              <FieldError>{m.postJob_descriptionRequiredError()}</FieldError>
            ) : null}
          </Field>

          {jobForm.salary.visible ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <Field>
                <FieldLabel htmlFor="job-currency">
                  {m.postJob_currencyLabel()}
                </FieldLabel>
                <Select
                  items={currencyItems}
                  value={form.currency}
                  onValueChange={(value: string | null) =>
                    set('currency', value ?? 'USD')
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
                  onValueChange={(value: SalaryTimeframe | null) =>
                    set('salaryTimeframe', value ?? DEFAULT_SALARY_TIMEFRAME)
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
          ) : null}

          <Field>
            <FieldLabel>{m.employerPostJob_applyMethodLabel()}</FieldLabel>
            <RadioGroup
              value={form.applyMethod}
              onValueChange={(value) =>
                set('applyMethod', value === 'native' ? 'native' : 'external')
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
            <Field data-invalid={fieldErrors.applicationTarget || undefined}>
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

      {showBilling ? (
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
                  onValueChange={(value: string | null) =>
                    setSelectedBilling(value ?? null)
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
                          plan.prices.find((candidate) => candidate.isActive) ??
                          plan.prices[0];
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
      ) : null}

      {/* In-page form: primary action left-aligned, Cancel a ghost beside it —
          a single inline row, not a stacked pair. */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          disabled={status === 'saving' || status === 'committed'}
        >
          {submitLabel}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() =>
            void router.navigate({
              to: '/employers/companies/$slug',
              params: { slug },
            })
          }
        >
          {m.employerOnboarding_cancelLabel()}
        </Button>
        {status === 'error' || (status === 'committed' && message) ? (
          <FieldError>{message}</FieldError>
        ) : null}
        {status === 'committed' && committedCheckoutJobId && message ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => void runCheckout(committedCheckoutJobId)}
          >
            {m.postJob_checkoutButtonLabel()}
          </Button>
        ) : null}
        {notice ? (
          <p role="status" className="text-sm">
            {notice}
          </p>
        ) : null}
      </div>
    </form>
  );
}
