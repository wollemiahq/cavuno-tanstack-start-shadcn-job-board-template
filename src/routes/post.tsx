import { Text } from '@/components/text'
import { useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Radio as AriaRadio } from 'react-aria-components'

import { fieldLabel } from '@cavuno/board/format'

import { Avatar } from '@/components/base/avatar/avatar'
import { Button } from '@/components/base/buttons/button'
import { FileUpload } from '@/components/application/file-upload/file-upload-base'
import { LoadingIndicator } from '@/components/application/loading-indicator/loading-indicator'
import { InputBase } from '@/components/base/input/input'
import { InputGroup } from '@/components/base/input/input-group'
import { InputNumber } from '@/components/base/input/input-number'
import { Label } from '@/components/base/input/label'
import {
  RadioButtonBase,
  RadioGroup,
} from '@/components/base/radio-buttons/radio-buttons'
import { Select } from '@/components/base/select/select'
import { RichTextEditor } from '@/components/rich-text-editor'
import { cx } from '@/utils/cx'
import { getLocale } from '../paraglide/runtime'
import { m } from '../paraglide/messages'
import {
  ensureProtocol,
  isRichTextEmpty,
  looksLikeDomain,
  toDomain,
} from '../lib/post-form'
import { salaryCurrencyOptions } from '../lib/salary-currencies'
import {
  fetchLogoByDomain,
  getPostPlans,
  submitJobPosting,
  uploadLogo,
} from '../server/post'

/**
 * Plan-price display in the PLAN's currency. This is checkout copy, not
 * salary data — the `@cavuno/board/seo` salary formatter is USD-hardcoded
 * (hosted parity), so the price keeps its own currency-aware formatter.
 */
const formatPrice = (amount: number, currency: string) =>
  new Intl.NumberFormat('en', {
    style: 'currency',
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
    notation: 'compact',
  }).format(amount)

export const Route = createFileRoute('/post')({
  head: () => ({ meta: [{ title: m.postJob_title() }] }),
  loader: () => getPostPlans(),
  component: PostJobPage,
})

const EMPLOYMENT_TYPES = [
  'full_time',
  'part_time',
  'contract',
  'internship',
  'temporary',
]
const REMOTE_OPTIONS = ['remote', 'hybrid', 'on_site']

/** The bare-domain URL fields render `acme.com`; this addon shows the scheme. */
const PROTOCOL_PREFIX = 'https://'

/** ISO 4217 options for the salary currency picker (see salary-currencies). */
const CURRENCY_ITEMS = salaryCurrencyOptions().map((o) => ({
  id: o.value,
  label: o.label,
}))

type Status =
  | { kind: 'idle' }
  | { kind: 'pending' }
  | { kind: 'error'; message: string }
  | { kind: 'done'; title: string; body: string }

type LogoStatus =
  | { kind: 'idle' }
  | { kind: 'working' }
  | { kind: 'error'; message: string }

function PostJobPage() {
  const plans = Route.useLoaderData()
  const locale = getLocale()
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const formRef = useRef<HTMLFormElement>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [logoStatus, setLogoStatus] = useState<LogoStatus>({ kind: 'idle' })
  const [description, setDescription] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [companyName, setCompanyName] = useState('')
  // Domains we've already auto-fetched a logo for — one attempt per value so
  // a failed lookup can't loop on every blur.
  const autoFetched = useRef<Set<string>>(new Set())

  const salaryFormat = {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  } as const

  function readWebsite() {
    return formRef.current
      ? new FormData(formRef.current).get('companyWebsite')?.toString().trim()
      : undefined
  }

  async function runLogoFetch(domain: string) {
    // Clear the prior logo so a failed fetch can't leave a stale preview.
    setLogoUrl(null)
    setLogoStatus({ kind: 'working' })
    const res = await fetchLogoByDomain({ data: { domain } })
    if (res.ok) {
      setLogoUrl(res.publicUrl)
      setLogoStatus({ kind: 'idle' })
    } else {
      setLogoStatus({ kind: 'error', message: res.message })
    }
  }

  async function onLogoFiles(files: FileList) {
    const file = files[0]
    if (!file) return
    // Clear the prior logo so a failed upload can't leave a stale preview/submit.
    setLogoUrl(null)
    setLogoStatus({ kind: 'working' })
    const fd = new FormData()
    fd.append('file', file)
    const res = await uploadLogo({ data: fd })
    if (res.ok) {
      setLogoUrl(res.publicUrl)
      setLogoStatus({ kind: 'idle' })
    } else {
      setLogoStatus({ kind: 'error', message: res.message })
    }
  }

  // Auto-fetch the logo once the website blurs with a plausible domain and no
  // logo has been set (uploaded or fetched) yet — the only logo-fetch path.
  // Re-editing the website field retries (a new domain value fetches again).
  function onWebsiteBlur() {
    if (logoUrl !== null || logoStatus.kind === 'working') return
    const raw = readWebsite()
    if (!raw || !looksLikeDomain(raw)) return
    const domain = toDomain(raw)
    if (autoFetched.current.has(domain)) return
    autoFetched.current.add(domain)
    void runLogoFetch(domain)
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (isRichTextEmpty(description)) {
      setStatus({
        kind: 'error',
        message: m.postJob_descriptionRequiredError(),
      })
      return
    }

    setStatus({ kind: 'pending' })
    const f = new FormData(event.currentTarget)
    const num = (k: string) => {
      const v = f.get(k)
      if (!v) return undefined
      // The react-aria NumberField may submit a locale-formatted string
      // (e.g. "$60,000") — strip everything but the digits before parsing.
      const parsed = Number(String(v).replace(/[^0-9.-]/g, ''))
      return Number.isFinite(parsed) ? parsed : undefined
    }
    const str = (k: string) => {
      const v = f.get(k)
      return v ? String(v) : undefined
    }

    const res = await submitJobPosting({
      data: {
        companyName: String(f.get('companyName')),
        companyWebsite: ensureProtocol(str('companyWebsite')),
        contactName: String(f.get('contactName')),
        contactEmail: String(f.get('contactEmail')),
        title: String(f.get('title')),
        description,
        employmentType: String(f.get('employmentType')),
        remoteOption: String(f.get('remoteOption')),
        applicationUrl: ensureProtocol(str('applicationUrl')) ?? '',
        salaryMin: num('salaryMin'),
        salaryMax: num('salaryMax'),
        salaryCurrency: currency,
        selectedPlan: str('selectedPlan'),
        logoUrl: logoUrl ?? undefined,
      },
    })

    if (!res.ok) {
      setStatus({ kind: 'error', message: res.message })
      return
    }

    const r = res.result
    if (r.status === 'checkout') {
      // Redirect the poster to Stripe Checkout to complete payment.
      window.location.href = r.checkoutUrl
      return
    }
    if (r.status === 'published') {
      setStatus({
        kind: 'done',
        title: m.postJob_publishedTitle(),
        body: m.postJob_publishedBody(),
      })
      return
    }
    if (r.status === 'pending_approval') {
      setStatus({
        kind: 'done',
        title: m.postJob_pendingTitle(),
        body: m.postJob_pendingBody(),
      })
      return
    }
    setStatus({
      kind: 'done',
      title: m.postJob_invoiceTitle(),
      body: m.postJob_invoiceBody(),
    })
  }

  if (status.kind === 'done') {
    return (
      <div className="mx-auto max-w-md space-y-3 rounded-lg border border-secondary p-10 text-center">
        <Text as="h1" variant="heading1">{status.title}</Text>
        <p className="text-tertiary">{status.body}</p>
      </div>
    )
  }

  const companyInitials = companyName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()

  const employmentItems = EMPLOYMENT_TYPES.map((o) => ({
    id: o,
    label: fieldLabel(locale, o) ?? o,
  }))
  const remoteItems = REMOTE_OPTIONS.map((o) => ({
    id: o,
    label: fieldLabel(locale, o) ?? o,
  }))

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <Text as="h1" variant="heading1">{m.postJob_title()}</Text>
        <p className="text-tertiary">
          {m.postJob_subtitle()}
        </p>
      </header>

      <form ref={formRef} className="space-y-6" onSubmit={onSubmit}>
        <section className="space-y-4">
          <Text as="h2" variant="heading4">{m.postJob_companyHeading()}</Text>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="companyName">{m.postJob_companyNameLabel()}</Label>
              <InputBase
                id="companyName"
                name="companyName"
                isRequired
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
              />
            </div>
            <div onBlur={onWebsiteBlur}>
              <InputGroup
                name="companyWebsite"
                label={m.postJob_companyWebsiteLabel()}
                leadingAddon={<InputGroup.Prefix>{PROTOCOL_PREFIX}</InputGroup.Prefix>}
              >
                <InputBase />
              </InputGroup>
            </div>
            <Labeled label={m.postJob_contactNameLabel()} name="contactName" required />
            <Labeled
              label={m.postJob_contactEmailLabel()}
              name="contactEmail"
              type="email"
              required
            />
          </div>
        </section>

        <section className="space-y-3">
          <Text as="h2" variant="heading4">{m.postJob_logoLabel()}</Text>
          <div className="flex items-start gap-4">
            <Avatar
              size="xl"
              rounded={false}
              src={logoUrl}
              alt={m.postJob_logoPreviewAlt()}
              initials={companyInitials}
            />
            <div className="min-w-0 flex-1 space-y-2">
              <FileUpload.DropZone
                accept="image/jpeg,image/png,image/webp,image/gif"
                allowsMultiple={false}
                isDisabled={logoStatus.kind === 'working'}
                hint={m.postJob_logoDropHint()}
                onDropFiles={onLogoFiles}
              />
              {logoStatus.kind === 'working' ? (
                <LoadingIndicator
                  type="line-spinner"
                  size="sm"
                  label={m.postJob_workingLabel()}
                />
              ) : null}
              {logoStatus.kind === 'error' ? (
                <p className="text-sm text-error-primary">{logoStatus.message}</p>
              ) : null}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <Text as="h2" variant="heading4">{m.postJob_roleHeading()}</Text>
          <Labeled label={m.postJob_jobTitleLabel()} name="title" required />
          <div className="space-y-1.5">
            <Label>{m.postJob_descriptionLabel()}</Label>
            <RichTextEditor
              value={description}
              onChange={setDescription}
              ariaLabel={m.postJob_descriptionLabel()}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
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
          <InputGroup
            name="applicationUrl"
            isRequired
            label={m.postJob_applicationUrlLabel()}
            leadingAddon={<InputGroup.Prefix>{PROTOCOL_PREFIX}</InputGroup.Prefix>}
          >
            <InputBase />
          </InputGroup>
          <div className="grid gap-4 sm:grid-cols-3">
            <Select
              name="salaryCurrency"
              label={m.postJob_currencyLabel()}
              selectedKey={currency}
              onSelectionChange={(key) => setCurrency(String(key))}
              items={CURRENCY_ITEMS}
            >
              {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
            </Select>
            <InputNumber
              label={m.postJob_salaryMinLabel()}
              name="salaryMin"
              minValue={0}
              formatOptions={salaryFormat}
            />
            <InputNumber
              label={m.postJob_salaryMaxLabel()}
              name="salaryMax"
              minValue={0}
              formatOptions={salaryFormat}
            />
          </div>
        </section>

        <section className="space-y-3">
          <Text as="h2" variant="heading4">{m.postJob_planHeading()}</Text>
          <RadioGroup
            name="selectedPlan"
            defaultValue={plans.data[0]?.id}
            className="gap-2"
            aria-label={m.postJob_planHeading()}
          >
            {plans.data.map((plan) => {
              const price = plan.prices[0]
              return (
                <AriaRadio
                  key={plan.id}
                  value={plan.id}
                  className={({ isSelected, isFocusVisible }) =>
                    cx(
                      'flex cursor-pointer items-start gap-3 rounded-lg p-4 ring-1 ring-inset transition',
                      isSelected ? 'ring-2 ring-brand' : 'ring-primary',
                      isFocusVisible && 'outline-2 outline-offset-2 outline-focus-ring',
                    )
                  }
                >
                  {({ isSelected }) => (
                    <>
                      <RadioButtonBase size="md" isSelected={isSelected} className="mt-0.5" />
                      <span className="flex-1">
                        <span className="block font-medium text-secondary">{plan.name}</span>
                        {plan.description ? (
                          <span className="block text-sm text-tertiary">
                            {plan.description}
                          </span>
                        ) : null}
                      </span>
                      <span className="font-medium text-primary">
                        {price
                          ? formatPrice(price.amountCents / 100, price.currency)
                          : m.postJob_freeLabel()}
                      </span>
                    </>
                  )}
                </AriaRadio>
              )
            })}
          </RadioGroup>
        </section>

        {status.kind === 'error' ? (
          <p className="text-sm text-error-primary">{status.message}</p>
        ) : null}

        <Button
          type="submit"
          color="primary"
          size="md"
          isLoading={status.kind === 'pending'}
          showTextWhileLoading
        >
          {status.kind === 'pending'
            ? m.postJob_submittingLabel()
            : m.postJob_submitButtonLabel()}
        </Button>
      </form>
    </div>
  )
}

function Labeled({
  label,
  name,
  type = 'text',
  required = false,
}: {
  label: string
  name: string
  type?: string
  required?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <InputBase id={name} name={name} type={type} isRequired={required} />
    </div>
  )
}

function SelectField({
  label,
  name,
  items,
}: {
  label: string
  name: string
  items: { id: string; label: string }[]
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Select name={name} isRequired defaultSelectedKey={items[0]?.id} items={items}>
        {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
      </Select>
    </div>
  )
}
