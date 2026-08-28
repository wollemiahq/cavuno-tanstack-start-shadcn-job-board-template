'use client';

import { useMemo, useRef, useState } from 'react';

import { countryOptions } from '@cavuno/board/format';
import { Check, ImagePlus } from 'lucide-react';

import {
  DEFAULT_SALARY_TIMEFRAME,
  ensureProtocol,
  isRichTextEmpty,
  normalizeApplicationTarget,
  looksLikeDomain,
  remotePermitsSubmission,
  SALARY_TIMEFRAMES,
  toDomain,
  type RemotePermitSelection,
  type SalaryTimeframe,
} from '../lib/post-form';
import { salaryCurrencyOptions } from '../lib/salary-currencies';
import { m } from '../paraglide/messages';
import { PageSection } from './layout/page';
import { RichTextEditor, type RichTextEditorProps } from './rich-text-editor';
import { Alert, AlertDescription } from './ui/alert';
import {
  Attachment,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from './ui/attachment';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from './ui/empty';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldTitle,
} from './ui/field';
import { Input } from './ui/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from './ui/input-group';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Spinner } from './ui/spinner';

import type {
  LogoResult,
  SubmitJobInput,
  SubmitJobResult,
} from '../server/post';
import {
  narrowOptions,
  resolveJobFormConstraints,
  type JobFormSource,
} from '@/board/job-form';
import type { LocationSuggestionVM } from '@/board/location-suggestion';
import { planDescription, planName } from '@/board/plan-labels';
import { planFeatureLines } from '@/board/plan-view-model';
import {
  CustomFieldsGroup,
  type CustomFieldValues,
} from '@/components/custom-fields-group';
import type { LocationSuggestionState } from '@/components/location-combobox';
import { PlaceTagsField } from '@/components/place-tags-field';
import { boardErrorMessage } from '@/lib/board-error-message';
import { enumLabel, salaryTimeframeLabel } from '@/lib/enum-labels';
import { searchString } from '@/lib/pagination';
import type {
  JobPostingPlan,
  PublicBoard,
  RemotePermitTaxonomyEntry,
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
const PROTOCOL_PREFIX = 'https://';
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

type RemoteOptionChoice = (typeof REMOTE_OPTIONS)[number];

type Status =
  | { kind: 'idle' }
  | { kind: 'pending' }
  | { kind: 'error'; message: string }
  | { kind: 'done'; title: string; body: string };

type LogoStatus =
  | { kind: 'idle' }
  | { kind: 'working' }
  | { kind: 'error'; message: string };

type OfficeLocationDraft = {
  key: string;
  displayName: string;
  countryCode?: string;
  region?: string;
};

type PostJobFormState = {
  status: Status;
  logoUrl: string | null;
  logoStatus: LogoStatus;
  description: string;
  currency: string;
  salaryTimeframe: SalaryTimeframe;
  companyName: string;
  remoteOption: (typeof REMOTE_OPTIONS)[number];
  remotePermitSelections: RemotePermitSelection[];
  seniority: string | null;
  officeLocations: OfficeLocationDraft[];
  officeLocationsError: boolean;
  customFieldValues: CustomFieldValues;
};

function remoteOptionChoice(
  value: string | null | undefined,
): RemoteOptionChoice | undefined {
  return REMOTE_OPTIONS.find((option) => option === value);
}

function salaryTimeframeChoice(
  value: string | null | undefined,
): SalaryTimeframe | undefined {
  return SALARY_TIMEFRAMES.find((timeframe) => timeframe === value);
}

export type PostJobFormProps = {
  locale: string;
  plans: JobPostingPlan[];
  officeLocationSuggestions: LocationSuggestionState;
  /** Board-defined custom field definitions, in operator-config order. */
  customFields: PublicBoard['customFields']['job'];
  /** Built-in field visibility from `board.context().jobForm`. */
  jobForm?: JobFormSource | null;
  /**
   * The remote-permit taxonomy (regions / country groups) for the
   * geographic-restriction scope; `null` degrades to worldwide/countries.
   */
  remotePermits: RemotePermitTaxonomyEntry[] | null;
  initialPlanId?: string;
  onSubmit: (input: SubmitJobInput) => Promise<SubmitJobResult>;
  onLogoFetch: (domain: string) => Promise<LogoResult>;
  onLogoUpload: (data: FormData) => Promise<LogoResult>;
  onCheckout: (url: string) => void;
  /** Editor implementation seam for isolated form tests. */
  DescriptionEditor?: React.ComponentType<RichTextEditorProps>;
};

function formatPrice(locale: string, amount: number, currency: string) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(amount);
}

function readNumber(form: FormData, name: string) {
  const value = form.get(name);
  if (!value) return undefined;
  const parsed = Number(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function readString(form: FormData, name: string) {
  const value = form.get(name);
  return value ? String(value) : undefined;
}

export function PostJobForm({
  locale,
  plans,
  officeLocationSuggestions,
  customFields,
  jobForm: jobFormSource,
  remotePermits,
  initialPlanId,
  onSubmit,
  onLogoFetch,
  onLogoUpload,
  onCheckout,
  DescriptionEditor = RichTextEditor,
}: PostJobFormProps) {
  const jobForm = resolveJobFormConstraints(jobFormSource);
  // A board narrowed to e.g. remote-only or EUR-only would otherwise open
  // the form pre-filled with a value it rejects, and the employer would
  // never think to change it.
  const defaultRemoteOption = preferredDefault(
    'hybrid',
    narrowOptions(REMOTE_OPTIONS, jobForm.workArrangement.allowedOptions),
  );
  const currencyOptions = salaryCurrencyOptions(
    jobForm.salary.allowedCurrencies,
  );
  const defaultCurrency = preferredDefault(
    'USD',
    currencyOptions.map(({ value }) => value),
  );
  const formRef = useRef<HTMLFormElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const autoFetched = useRef(new Set<string>());
  const [formState, setFormState] = useState<PostJobFormState>({
    status: { kind: 'idle' },
    logoUrl: null,
    logoStatus: { kind: 'idle' },
    description: '',
    currency: defaultCurrency,
    salaryTimeframe: DEFAULT_SALARY_TIMEFRAME,
    companyName: '',
    remoteOption: defaultRemoteOption,
    remotePermitSelections: [],
    seniority: null,
    officeLocations: [],
    officeLocationsError: false,
    customFieldValues: {},
  });
  const {
    status,
    logoUrl,
    logoStatus,
    description,
    currency,
    salaryTimeframe,
    companyName,
    remoteOption,
    remotePermitSelections,
    seniority,
    officeLocations,
    officeLocationsError,
    customFieldValues,
  } = formState;

  function updateFormState(patch: Partial<PostJobFormState>) {
    setFormState((current) => ({ ...current, ...patch }));
  }

  function addOfficeLocation(location: OfficeLocationDraft) {
    // Mirror the server rule exactly (`collectJobConstraintViolations`): a
    // location is rejected only when it HAS a country code outside the
    // board's list. Free text carries no country and is left alone there,
    // so rejecting it here would be stricter than the platform.
    const allowedCountries = jobForm.location.allowedCountries;
    if (
      allowedCountries &&
      location.countryCode &&
      !allowedCountries.includes(location.countryCode)
    ) {
      updateFormState({
        officeLocationsError: true,
        status: {
          kind: 'error',
          message: m.jobForm_officeLocationCountryNotAllowedError({
            countries: allowedCountries.join(', '),
          }),
        },
      });
      return;
    }
    setFormState((current) =>
      current.officeLocations.some((entry) => entry.key === location.key)
        ? current
        : {
            ...current,
            officeLocations: [...current.officeLocations, location],
            officeLocationsError: false,
          },
    );
  }

  // Default the picker to the deep-linked plan when valid, otherwise to the
  // plan the board marks recommended, falling back to the first listed plan —
  // so a plan is always selected when the form opens.
  const defaultPlanId = plans.some((plan) => plan.id === initialPlanId)
    ? initialPlanId
    : (plans.find((plan) => plan.isRecommended) ?? plans[0])?.id;
  const [selectedPlanId, setSelectedPlanId] = useState<string | undefined>(
    defaultPlanId,
  );
  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId);
  // A free plan publishes on submit; a paid plan hands off to checkout — the
  // primary label names whichever the chosen plan will do.
  const submitLabel =
    selectedPlan?.kind === 'free'
      ? m.postJob_submitButtonLabel()
      : m.postJob_checkoutButtonLabel();
  // Narrow every picker to what the board accepts. The platform 400s a job
  // carrying a disallowed value (`JOBS_CONSTRAINT_VIOLATION`), so an
  // un-narrowed picker is a trap: the employer fills the whole form and
  // only then learns the option was never on offer.
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
  // The geographic-restriction option space: world regions and country
  // groups from the remote-permit taxonomy (absent when the taxonomy is
  // unavailable), then every country from the SDK lexicon — one searchable
  // list, encoded as `type:value` ids so a pick maps straight to a permit.
  const [permitQuery, setPermitQuery] = useState('');
  const countryChoices = useMemo(() => countryOptions(locale), [locale]);
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
  const currencyItems = currencyOptions.map(({ value, label }) => ({
    value,
    label,
  }));
  // The timeframe words are the SDK's, so the select reads the same language
  // as the salary ranges it produces — no parallel copy to drift.
  const timeframeLabel = (value: string) =>
    salaryTimeframeLabel(value) ?? value;
  const timeframeItems = SALARY_TIMEFRAMES.map((value) => ({
    value,
    label: timeframeLabel(value),
  }));

  async function runLogoAction(action: () => Promise<LogoResult>) {
    updateFormState({ logoUrl: null, logoStatus: { kind: 'working' } });

    try {
      const result = await action();
      if (result.ok) {
        updateFormState({
          logoUrl: result.publicUrl,
          logoStatus: { kind: 'idle' },
        });
        return;
      }
      updateFormState({
        logoStatus: { kind: 'error', message: boardErrorMessage(result) },
      });
    } catch {
      updateFormState({
        logoStatus: {
          kind: 'error',
          message: m.candidateAction_errorText(),
        },
      });
    }
  }

  function onWebsiteBlur() {
    if (logoUrl !== null || logoStatus.kind === 'working') return;
    const value = formRef.current
      ? new FormData(formRef.current).get('companyWebsite')?.toString().trim()
      : undefined;
    if (!value || !looksLikeDomain(value)) return;

    const domain = toDomain(value);
    if (autoFetched.current.has(domain)) return;
    autoFetched.current.add(domain);
    void runLogoAction(() => onLogoFetch(domain));
  }

  function onLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    uploadLogoFile(file);
  }

  function uploadLogoFile(file: File) {
    const data = new FormData();
    data.append('file', file);
    void runLogoAction(() => onLogoUpload(data));
  }

  function onLogoDragOver(event: React.DragEvent) {
    event.preventDefault();
  }

  function onLogoDrop(event: React.DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (logoStatus.kind === 'working') return;
    const file = event.dataTransfer.files[0];
    if (file) uploadLogoFile(file);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isRichTextEmpty(description)) {
      updateFormState({
        status: {
          kind: 'error',
          message: m.postJob_descriptionRequiredError(),
        },
      });
      return;
    }

    // Board-configured requirements. The platform enforces these on create
    // (`collectJobConstraintViolations` → 400), so catching them here is the
    // difference between an inline message and an opaque failure after the
    // employer has filled the entire form.
    if (jobForm.seniority.visible && jobForm.seniority.required && !seniority) {
      updateFormState({
        status: {
          kind: 'error',
          message: m.jobForm_seniorityRequiredError(),
        },
      });
      return;
    }

    // On-site and hybrid roles need somewhere to be on-site AT — mirror the
    // hosted submission wizard's requirement. Remote roles may leave it empty.
    if (
      jobForm.location.visible &&
      remoteOption !== 'remote' &&
      officeLocations.length === 0
    ) {
      updateFormState({
        officeLocationsError: true,
        status: {
          kind: 'error',
          message: m.postJob_officeLocationsRequiredError(),
        },
      });
      return;
    }

    const form = new FormData(event.currentTarget);
    const salaryMin = readNumber(form, 'salaryMin');
    const salaryMax = readNumber(form, 'salaryMax');

    if (jobForm.salary.visible) {
      if (
        jobForm.salary.required &&
        (salaryMin === undefined || salaryMax === undefined)
      ) {
        updateFormState({
          status: { kind: 'error', message: m.jobForm_salaryRequiredError() },
        });
        return;
      }
      // Bounds ride only on a required salary (the API drops them
      // otherwise), so an absent value here means the field is optional and
      // left blank — nothing to check.
      const { minBound, maxBound } = jobForm.salary;
      const entered = [salaryMin, salaryMax].filter(
        (value): value is number => value !== undefined,
      );
      if (minBound !== null && entered.some((value) => value < minBound)) {
        updateFormState({
          status: {
            kind: 'error',
            message: m.jobForm_salaryBelowMinError({ min: minBound }),
          },
        });
        return;
      }
      if (maxBound !== null && entered.some((value) => value > maxBound)) {
        updateFormState({
          status: {
            kind: 'error',
            message: m.jobForm_salaryAboveMaxError({ max: maxBound }),
          },
        });
        return;
      }
    }

    updateFormState({ status: { kind: 'pending' } });

    // Empty strings / empty selections are"unanswered", not values.
    const submittableCustomFieldValues = Object.fromEntries(
      Object.entries(customFieldValues).filter(([, value]) =>
        Array.isArray(value) ? value.length > 0 : value !== '',
      ),
    );

    try {
      const input: SubmitJobInput = {
        companyName: String(form.get('companyName')),
        companyWebsite: ensureProtocol(readString(form, 'companyWebsite')),
        contactName: String(form.get('contactName')),
        contactEmail: String(form.get('contactEmail')),
        title: String(form.get('title')),
        description,
        employmentType: String(form.get('employmentType')),
        remoteOption: String(form.get('remoteOption')),
        officeLocations: jobForm.location.visible
          ? officeLocations.map(({ key: _key, ...location }) => location)
          : [],
        applicationUrl:
          normalizeApplicationTarget(readString(form, 'applicationUrl')) ?? '',
        selectedPlan: selectedPlanId,
        logoUrl: logoUrl ?? undefined,
      };
      if (jobForm.salary.visible) {
        input.salaryMin = salaryMin;
        input.salaryMax = salaryMax;
        input.salaryCurrency = currency;
        input.salaryTimeframe = salaryTimeframe;
      }
      if (jobForm.seniority.visible && seniority) input.seniority = seniority;
      if (remoteOption === 'remote') {
        Object.assign(
          input,
          remotePermitsSubmission(
            remotePermitSelections,
            m.postJob_remoteRestrictionWorldwide(),
          ),
        );
      }
      if (Object.keys(submittableCustomFieldValues).length) {
        input.customFieldValues = submittableCustomFieldValues;
      }
      const result = await onSubmit(input);

      if (!result.ok) {
        updateFormState({
          status: { kind: 'error', message: boardErrorMessage(result) },
        });
        return;
      }

      switch (result.result.status) {
        case 'checkout':
          onCheckout(result.result.checkoutUrl);
          return;
        case 'published':
          updateFormState({
            status: {
              kind: 'done',
              title: m.postJob_publishedTitle(),
              body: m.postJob_publishedBody(),
            },
          });
          return;
        case 'pending_approval':
          updateFormState({
            status: {
              kind: 'done',
              title: m.postJob_pendingTitle(),
              body: m.postJob_pendingBody(),
            },
          });
          return;
        case 'invoice_sent':
          updateFormState({
            status: {
              kind: 'done',
              title: m.postJob_invoiceTitle(),
              body: m.postJob_invoiceBody(),
            },
          });
      }
    } catch {
      updateFormState({
        status: { kind: 'error', message: m.candidateAction_errorText() },
      });
    }
  }

  if (status.kind === 'done') {
    return (
      <Card className="mx-auto max-w-xl text-center">
        <CardContent className="space-y-2 py-8">
          <h2 className="font-heading text-3xl font-semibold tracking-tight">
            {status.title}
          </h2>
          <p className="text-muted-foreground">{status.body}</p>
        </CardContent>
      </Card>
    );
  }

  if (plans.length === 0) {
    return (
      <Empty className="border-border border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ImagePlus aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>{m.postJob_noPlansTitle()}</EmptyTitle>
          <EmptyDescription>{m.postJob_noPlansBody()}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <form
      ref={formRef}
      className="flex flex-col gap-10"
      aria-busy={status.kind === 'pending'}
      onSubmit={handleSubmit}
    >
      <PageSection title={m.postJob_companyHeading()}>
        <Field data-invalid={logoStatus.kind === 'error'}>
          <input
            ref={logoInputRef}
            id="companyLogo"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            tabIndex={-1}
            aria-hidden="true"
            className="sr-only"
            disabled={logoStatus.kind === 'working'}
            onChange={onLogoChange}
          />
          <Attachment
            data-testid="company-logo-dropzone"
            className="w-full"
            state={
              logoStatus.kind === 'working'
                ? 'uploading'
                : logoStatus.kind === 'error'
                  ? 'error'
                  : logoUrl
                    ? 'done'
                    : 'idle'
            }
            onDragOver={onLogoDragOver}
            onDrop={onLogoDrop}
          >
            <AttachmentMedia variant={logoUrl ? 'image' : 'icon'}>
              {logoStatus.kind === 'working' ? (
                <Spinner />
              ) : logoUrl ? (
                <img src={logoUrl} alt={m.postJob_logoPreviewAlt()} />
              ) : (
                <ImagePlus aria-hidden="true" />
              )}
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>
                {logoStatus.kind === 'working'
                  ? m.postJob_workingLabel()
                  : logoUrl
                    ? m.logoUpload_changeLogoLabel()
                    : m.postJob_logoLabel()}
              </AttachmentTitle>
              <AttachmentDescription>
                {m.postJob_logoDropHint()}
              </AttachmentDescription>
            </AttachmentContent>
            {logoStatus.kind === 'working' ? null : (
              <AttachmentTrigger
                aria-label={
                  logoUrl
                    ? m.logoUpload_changeLogoLabel()
                    : m.postJob_logoLabel()
                }
                onDragOver={onLogoDragOver}
                onDrop={onLogoDrop}
                onClick={() => logoInputRef.current?.click()}
              />
            )}
          </Attachment>
          {logoStatus.kind === 'error' ? (
            <FieldError>{logoStatus.message}</FieldError>
          ) : null}
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <LabeledInput
            label={m.postJob_companyNameLabel()}
            name="companyName"
            required
            value={companyName}
            onChange={(event) =>
              updateFormState({ companyName: event.target.value })
            }
          />
          <LabeledUrlInput
            label={m.postJob_companyWebsiteLabel()}
            name="companyWebsite"
            onBlur={onWebsiteBlur}
          />
          <LabeledInput
            label={m.postJob_contactNameLabel()}
            name="contactName"
            required
          />
          <LabeledInput
            label={m.postJob_contactEmailLabel()}
            name="contactEmail"
            type="email"
            required
          />
        </div>
      </PageSection>

      <PageSection title={m.postJob_roleHeading()}>
        <div className="grid gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <SelectField
              label={m.postJob_employmentTypeLabel()}
              name="employmentType"
              items={employmentItems}
            />
            {jobForm.seniority.visible ? (
              <Field>
                <FieldLabel htmlFor="seniority">
                  {m.postJob_seniorityLabel()}
                </FieldLabel>
                <Select
                  items={seniorityItems}
                  name="seniority"
                  value={seniority}
                  onValueChange={(value: string | null) =>
                    updateFormState({
                      seniority: value ?? null,
                    })
                  }
                >
                  <SelectTrigger id="seniority" className="w-full">
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
          <LabeledInput
            label={m.postJob_jobTitleLabel()}
            name="title"
            required
          />
          <SelectField
            label={m.postJob_remoteOptionLabel()}
            name="remoteOption"
            items={remoteItems}
            value={remoteOption}
            onValueChange={(value) =>
              updateFormState({
                remoteOption:
                  remoteOptionChoice(searchString(value)) ??
                  defaultRemoteOption,
                officeLocationsError: false,
              })
            }
          />
          {jobForm.location.visible ? (
            <Field data-invalid={officeLocationsError || undefined}>
              <FieldLabel htmlFor="officeLocations">
                {m.postJob_officeLocationsLabel()}
              </FieldLabel>
              <PlaceTagsField
                id="officeLocations"
                tags={officeLocations.map((location) => ({
                  key: location.key,
                  label: location.displayName,
                }))}
                onAddSuggestion={(place: LocationSuggestionVM) =>
                  addOfficeLocation({
                    key: place.id,
                    displayName: place.name,
                    countryCode: place.countryCode ?? undefined,
                    region: place.regionCode ?? undefined,
                  })
                }
                onAddFreeText={(text) =>
                  addOfficeLocation({ key: `text:${text}`, displayName: text })
                }
                onRemove={(key) =>
                  updateFormState({
                    officeLocations: officeLocations.filter(
                      (location) => location.key !== key,
                    ),
                  })
                }
                placeholder={m.postJob_officeLocationsPlaceholder()}
                searchingText={m.locationCombobox_searchingText()}
                removeAriaLabel={(name) =>
                  m.placeTags_removeAriaLabel({ name })
                }
                {...officeLocationSuggestions}
              />
              {remoteOption === 'remote' ? (
                <FieldDescription>
                  {m.postJob_officeLocationsRemoteHelperText()}
                </FieldDescription>
              ) : null}
              {officeLocationsError ? (
                <FieldError>
                  {m.postJob_officeLocationsRequiredError()}
                </FieldError>
              ) : null}
            </Field>
          ) : null}
          {remoteOption === 'remote' ? (
            <Field>
              <FieldLabel htmlFor="remotePermits">
                {m.postJob_remoteRestrictionLabel()}
              </FieldLabel>
              <PlaceTagsField
                id="remotePermits"
                tags={remotePermitSelections.map((selection) => ({
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
                  setFormState((current) =>
                    current.remotePermitSelections.some(
                      (entry) =>
                        entry.type === selection.type &&
                        entry.value === selection.value,
                    )
                      ? current
                      : {
                          ...current,
                          remotePermitSelections: [
                            ...current.remotePermitSelections,
                            selection,
                          ],
                        },
                  );
                }}
                onRemove={(key) =>
                  updateFormState({
                    remotePermitSelections: remotePermitSelections.filter(
                      (selection) =>
                        `${selection.type}:${selection.value}` !== key,
                    ),
                  })
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
          <Field>
            <FieldLabel>{m.postJob_descriptionLabel()}</FieldLabel>
            <DescriptionEditor
              value={description}
              onChange={(value) => updateFormState({ description: value })}
              ariaLabel={m.postJob_descriptionLabel()}
            />
          </Field>
          {jobForm.salary.visible ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <SelectField
                label={m.postJob_currencyLabel()}
                name="salaryCurrency"
                items={currencyItems}
                value={currency}
                onValueChange={(value) =>
                  updateFormState({ currency: value ?? defaultCurrency })
                }
              />
              <LabeledInput
                label={m.postJob_salaryMinLabel()}
                name="salaryMin"
                type="number"
                min={0}
              />
              <LabeledInput
                label={m.postJob_salaryMaxLabel()}
                name="salaryMax"
                type="number"
                min={0}
              />
              <SelectField
                label={m.postJob_salaryTimeframeLabel()}
                name="salaryTimeframe"
                items={timeframeItems}
                value={salaryTimeframe}
                onValueChange={(value) =>
                  updateFormState({
                    salaryTimeframe:
                      salaryTimeframeChoice(searchString(value)) ??
                      DEFAULT_SALARY_TIMEFRAME,
                  })
                }
              />
            </div>
          ) : null}
          <Field>
            <FieldLabel htmlFor="applicationUrl">
              {m.postJob_applicationUrlLabel()}
            </FieldLabel>
            <Input
              id="applicationUrl"
              name="applicationUrl"
              required
              placeholder={m.postJob_applicationUrlPlaceholder()}
            />
          </Field>
          {/* Board-defined custom fields render as their own group
              after the built-in fields, in operator-config order. */}
          <CustomFieldsGroup
            definitions={customFields}
            values={customFieldValues}
            onChange={(values) =>
              updateFormState({ customFieldValues: values })
            }
          />
        </div>
      </PageSection>

      <PageSection title={m.postJob_planHeading()}>
        <RadioGroup
          name="selectedPlan"
          value={selectedPlanId ?? null}
          onValueChange={(value: string | null) =>
            setSelectedPlanId(value ?? undefined)
          }
          aria-label={m.postJob_planHeading()}
        >
          {plans.map((plan) => {
            const price =
              plan.prices.find(({ isActive }) => isActive) ?? plan.prices[0];
            const features = planFeatureLines(plan);
            return (
              // The owned Field choice card — the SAME idiom as the join
              // page's RoleSelector, so every card-style radio picker reads
              // as one system (selected state is field.tsx's built-in tint).
              <FieldLabel
                key={plan.id}
                htmlFor={`plan-${plan.id}`}
                className="hover:bg-muted cursor-pointer transition-colors"
              >
                <Field orientation="horizontal">
                  <RadioGroupItem
                    id={`plan-${plan.id}`}
                    value={plan.id}
                    aria-label={planName(plan)}
                  />
                  <FieldContent>
                    <FieldTitle>
                      <span className="flex flex-wrap items-center gap-2">
                        {planName(plan)}
                        {plan.isRecommended ? (
                          <Badge variant="secondary">
                            {m.postJob_recommendedLabel()}
                          </Badge>
                        ) : null}
                      </span>
                    </FieldTitle>
                    {planDescription(plan) ? (
                      <FieldDescription>
                        {planDescription(plan)}
                      </FieldDescription>
                    ) : null}
                    {features.length > 0 ? (
                      <ul className="text-muted-foreground mt-1 space-y-1 text-sm">
                        {features.map((feature) => (
                          <li key={feature} className="flex items-start gap-2">
                            <Check
                              className="text-primary mt-0.5 size-4 shrink-0"
                              aria-hidden
                            />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </FieldContent>
                  <span className="text-foreground font-medium">
                    {price
                      ? formatPrice(
                          locale,
                          price.amountCents / 100,
                          price.currency,
                        )
                      : plan.kind === 'free'
                        ? m.postJob_freeLabel()
                        : m.postJob_priceUnavailableLabel()}
                  </span>
                </Field>
              </FieldLabel>
            );
          })}
        </RadioGroup>
      </PageSection>

      {status.kind === 'error' ? (
        <Alert variant="destructive">
          <AlertDescription>{status.message}</AlertDescription>
        </Alert>
      ) : null}

      <div>
        <Button type="submit" size="lg" disabled={status.kind === 'pending'}>
          {status.kind === 'pending' ? (
            <Spinner data-icon="inline-start" />
          ) : null}
          {status.kind === 'pending'
            ? m.postJob_submittingLabel()
            : submitLabel}
        </Button>
      </div>
    </form>
  );
}

function LabeledInput({
  label,
  name,
  ...props
}: React.ComponentProps<typeof Input> & { label: string; name: string }) {
  return (
    <Field>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Input id={name} name={name} {...props} />
    </Field>
  );
}

function LabeledUrlInput({
  label,
  name,
  required,
  onBlur,
}: {
  label: string;
  name: string;
  required?: boolean;
  onBlur?: () => void;
}) {
  return (
    <Field onBlur={onBlur}>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <InputGroup>
        <InputGroupInput id={name} name={name} required={required} />
        <InputGroupAddon>
          <InputGroupText aria-hidden="true">{PROTOCOL_PREFIX}</InputGroupText>
        </InputGroupAddon>
      </InputGroup>
    </Field>
  );
}

function SelectField({
  label,
  name,
  items,
  value,
  onValueChange,
}: {
  label: string;
  name: string;
  items: { value: string; label: string }[];
  value?: string;
  onValueChange?: (value: string | null | undefined) => void;
}) {
  const props = value
    ? { value, onValueChange }
    : { defaultValue: items[0]?.value };

  return (
    <Field>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Select items={items} name={name} required {...props}>
        <SelectTrigger id={name} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {items.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
}
