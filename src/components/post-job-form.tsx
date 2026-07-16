'use client';

import { useRef, useState } from 'react';

import { fieldLabel, getSalaryLexicon } from '@cavuno/board/format';
import { ImagePlus } from 'lucide-react';

import {
  DEFAULT_SALARY_TIMEFRAME,
  ensureProtocol,
  isRichTextEmpty,
  looksLikeDomain,
  SALARY_TIMEFRAMES,
  toDomain,
  type SalaryTimeframe,
} from '../lib/post-form';
import { salaryCurrencyOptions } from '../lib/salary-currencies';
import { m } from '../paraglide/messages';
import { PageSection } from './layout/page';
import { RichTextEditor } from './rich-text-editor';
import { Alert, AlertDescription } from './ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
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
import type { JobPostingPlan } from '@cavuno/board';

const EMPLOYMENT_TYPES = [
  'full_time',
  'part_time',
  'contract',
  'internship',
  'temporary',
] as const;

const REMOTE_OPTIONS = ['remote', 'hybrid', 'on_site'] as const;
const PROTOCOL_PREFIX = 'https://';

type Status =
  | { kind: 'idle' }
  | { kind: 'pending' }
  | { kind: 'error'; message: string }
  | { kind: 'done'; title: string; body: string };

type LogoStatus =
  | { kind: 'idle' }
  | { kind: 'working' }
  | { kind: 'error'; message: string };

type PostJobFormState = {
  status: Status;
  logoUrl: string | null;
  logoStatus: LogoStatus;
  description: string;
  currency: string;
  salaryTimeframe: SalaryTimeframe;
  companyName: string;
};

export type PostJobFormProps = {
  locale: Parameters<typeof fieldLabel>[0];
  plans: JobPostingPlan[];
  initialPlanId?: string;
  onSubmit: (input: SubmitJobInput) => Promise<SubmitJobResult>;
  onLogoFetch: (domain: string) => Promise<LogoResult>;
  onLogoUpload: (data: FormData) => Promise<LogoResult>;
  onCheckout: (url: string) => void;
};

function formatPrice(
  locale: Parameters<typeof fieldLabel>[0],
  amount: number,
  currency: string,
) {
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
  initialPlanId,
  onSubmit,
  onLogoFetch,
  onLogoUpload,
  onCheckout,
}: PostJobFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const autoFetched = useRef(new Set<string>());
  const [formState, setFormState] = useState<PostJobFormState>({
    status: { kind: 'idle' },
    logoUrl: null,
    logoStatus: { kind: 'idle' },
    description: '',
    currency: 'USD',
    salaryTimeframe: DEFAULT_SALARY_TIMEFRAME,
    companyName: '',
  });
  const {
    status,
    logoUrl,
    logoStatus,
    description,
    currency,
    salaryTimeframe,
    companyName,
  } = formState;

  function updateFormState(patch: Partial<PostJobFormState>) {
    setFormState((current) => ({ ...current, ...patch }));
  }

  const selectedPlan = plans.some((plan) => plan.id === initialPlanId)
    ? initialPlanId
    : plans[0]?.id;
  const employmentItems = EMPLOYMENT_TYPES.map((value) => ({
    value,
    label: fieldLabel(locale, value) ?? value,
  }));
  const remoteItems = REMOTE_OPTIONS.map((value) => ({
    value,
    label: fieldLabel(locale, value) ?? value,
  }));
  const currencyItems = salaryCurrencyOptions().map(({ value, label }) => ({
    value,
    label,
  }));
  // The timeframe words are the SDK's, so the select reads the same language
  // as the salary ranges it produces — no parallel copy to drift.
  const timeframeWords = getSalaryLexicon(locale).timeframe;
  const timeframeItems = SALARY_TIMEFRAMES.map((value) => ({
    value,
    label: timeframeWords[value],
  }));

  const companyInitials = companyName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

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
        logoStatus: { kind: 'error', message: result.message },
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

  function onLogoDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
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

    const form = new FormData(event.currentTarget);
    const salaryMin = readNumber(form, 'salaryMin');
    const salaryMax = readNumber(form, 'salaryMax');
    updateFormState({ status: { kind: 'pending' } });

    try {
      const result = await onSubmit({
        companyName: String(form.get('companyName')),
        companyWebsite: ensureProtocol(readString(form, 'companyWebsite')),
        contactName: String(form.get('contactName')),
        contactEmail: String(form.get('contactEmail')),
        title: String(form.get('title')),
        description,
        employmentType: String(form.get('employmentType')),
        remoteOption: String(form.get('remoteOption')),
        applicationUrl:
          ensureProtocol(readString(form, 'applicationUrl')) ?? '',
        salaryMin,
        salaryMax,
        salaryCurrency: currency,
        salaryTimeframe,
        selectedPlan: readString(form, 'selectedPlan'),
        logoUrl: logoUrl ?? undefined,
      });

      if (!result.ok) {
        updateFormState({
          status: { kind: 'error', message: result.message },
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

      <PageSection
        title={m.postJob_logoLabel()}
        description={m.postJob_logoDropHint()}
      >
        <div
          data-testid="company-logo-dropzone"
          className="border-border flex items-center gap-4 rounded-3xl border border-dashed p-4"
          onDragOver={(event) => event.preventDefault()}
          onDrop={onLogoDrop}
        >
          <Avatar className="size-16 rounded-2xl after:rounded-2xl">
            {logoUrl ? (
              <AvatarImage
                src={logoUrl}
                alt={m.postJob_logoPreviewAlt()}
                className="rounded-2xl"
              />
            ) : null}
            <AvatarFallback className="rounded-2xl text-base">
              {companyInitials || <ImagePlus aria-hidden="true" />}
            </AvatarFallback>
          </Avatar>
          <Field
            className="min-w-0 flex-1 gap-2"
            data-invalid={logoStatus.kind === 'error'}
          >
            <FieldLabel htmlFor="companyLogo">
              {m.postJob_logoLabel()}
            </FieldLabel>
            <Input
              id="companyLogo"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              disabled={logoStatus.kind === 'working'}
              onChange={onLogoChange}
            />
            {logoStatus.kind === 'working' ? (
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <Spinner />
                {m.postJob_workingLabel()}
              </div>
            ) : null}
            {logoStatus.kind === 'error' ? (
              <FieldError>{logoStatus.message}</FieldError>
            ) : null}
          </Field>
        </div>
      </PageSection>

      <PageSection title={m.postJob_roleHeading()}>
        <div className="grid gap-5">
          <LabeledInput
            label={m.postJob_jobTitleLabel()}
            name="title"
            required
          />
          <Field>
            <FieldLabel>{m.postJob_descriptionLabel()}</FieldLabel>
            <RichTextEditor
              value={description}
              onChange={(value) => updateFormState({ description: value })}
              ariaLabel={m.postJob_descriptionLabel()}
            />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <SelectField
              label={m.postJob_employmentTypeLabel()}
              name="employmentType"
              items={employmentItems}
            />
            <SelectField
              label={m.postJob_remoteOptionLabel()}
              name="remoteOption"
              items={remoteItems}
            />
          </div>
          <LabeledUrlInput
            label={m.postJob_applicationUrlLabel()}
            name="applicationUrl"
            required
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <SelectField
              label={m.postJob_currencyLabel()}
              name="salaryCurrency"
              items={currencyItems}
              value={currency}
              onValueChange={(value) =>
                updateFormState({ currency: value ?? 'USD' })
              }
            />
            <SelectField
              label={m.postJob_salaryTimeframeLabel()}
              name="salaryTimeframe"
              items={timeframeItems}
              value={salaryTimeframe}
              onValueChange={(value) =>
                updateFormState({
                  salaryTimeframe:
                    (value as SalaryTimeframe | null) ??
                    DEFAULT_SALARY_TIMEFRAME,
                })
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
          </div>
        </div>
      </PageSection>

      <PageSection title={m.postJob_planHeading()}>
        <RadioGroup
          name="selectedPlan"
          defaultValue={selectedPlan}
          aria-label={m.postJob_planHeading()}
        >
          {plans.map((plan) => {
            const price =
              plan.prices.find(({ isActive }) => isActive) ?? plan.prices[0];
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
                      <FieldDescription>{plan.description}</FieldDescription>
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
            : m.postJob_submitButtonLabel()}
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
