'use client'

import { useState } from 'react'

import { useRouter } from '@tanstack/react-router'
import type { Alert, AlertBody } from '@cavuno/board'

import { Badge } from '@/components/base/badges/badges'
import { Button } from '@/components/base/buttons/button'
import { Checkbox } from '@/components/base/checkbox/checkbox'
import { Input } from '@/components/base/input/input'
import { Select } from '@/components/base/select/select'
import { m } from '../paraglide/messages'
import { createMyAlert, deleteMyAlert, updateMyAlert } from '../server/account'

const REMOTE_OPTIONS = ['on_site', 'hybrid', 'remote'] as const
const REMOTE_LABEL: Record<string, () => string> = {
  on_site: m.alertManager_remoteOnSite,
  hybrid: m.alertManager_remoteHybrid,
  remote: m.alertManager_remoteRemote,
}

interface FormState {
  label: string
  frequency: 'daily' | 'weekly'
  jobFunctions: string
  remoteOptions: string[]
}

function toBody(form: FormState, initial: Alert | null): AlertBody {
  const jobFunctions = form.jobFunctions
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
  const filters = initial?.filters
  return {
    ...(form.label.trim() ? { label: form.label.trim() } : {}),
    frequency: form.frequency,
    ...(jobFunctions.length ? { jobFunctions } : {}),
    ...(form.remoteOptions.length ? { remoteOptions: form.remoteOptions } : {}),
    // `update` is a whole-object PUT — round-trip the filters this simplified
    // UI doesn't edit (seniority / places / salary) so editing the label or
    // frequency doesn't silently wipe them.
    ...(filters?.seniorityLevels.length
      ? { seniorityLevels: filters.seniorityLevels }
      : {}),
    ...(filters?.placeIds.length ? { placeIds: filters.placeIds } : {}),
    ...(filters?.salaryMin != null ? { salaryMin: filters.salaryMin } : {}),
    ...(filters?.salaryMax != null ? { salaryMax: filters.salaryMax } : {}),
    ...(filters?.salaryCurrency != null
      ? { salaryCurrency: filters.salaryCurrency }
      : {}),
  }
}

function fromAlert(alert: Alert | null): FormState {
  return {
    label: alert?.label ?? '',
    frequency: alert?.frequency ?? 'weekly',
    jobFunctions: alert?.filters.jobFunctions.join(', ') ?? '',
    remoteOptions: alert?.filters.remoteOptions ?? [],
  }
}

function AlertForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: Alert | null
  submitLabel: string
  onSubmit: (body: AlertBody) => Promise<void>
  onCancel?: () => void
}) {
  const [form, setForm] = useState<FormState>(() => fromAlert(initial))
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle')

  return (
    <form
      data-test="alert-form"
      className="border-secondary space-y-3 rounded-lg border p-4"
      onSubmit={async (event) => {
        event.preventDefault()
        setStatus('saving')
        try {
          await onSubmit(toBody(form, initial))
          setStatus('idle')
        } catch {
          setStatus('error')
        }
      }}
    >
      <Input
        label={m.alertManager_nameLabel()}
        value={form.label}
        placeholder={m.alertManager_namePlaceholder()}
        onChange={(value) => setForm((prev) => ({ ...prev, label: value }))}
      />
      <Select
        label={m.alertManager_frequencyLabel()}
        data-test="alert-frequency"
        selectedKey={form.frequency}
        onSelectionChange={(key) =>
          setForm((prev) => ({
            ...prev,
            frequency: key as 'daily' | 'weekly',
          }))
        }
        items={[
          { id: 'daily', label: m.alertManager_frequencyDaily() },
          { id: 'weekly', label: m.alertManager_frequencyWeekly() },
        ]}
      >
        {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
      </Select>
      <Input
        label={m.alertManager_rolesLabel()}
        value={form.jobFunctions}
        placeholder={m.alertManager_rolesPlaceholder()}
        onChange={(value) =>
          setForm((prev) => ({ ...prev, jobFunctions: value }))
        }
      />
      <fieldset className="space-y-1.5">
        <legend className="text-sm font-medium">{m.alertManager_remoteOptionsLegend()}</legend>
        <div className="flex flex-wrap gap-4">
          {REMOTE_OPTIONS.map((option) => (
            <Checkbox
              key={option}
              size="sm"
              label={REMOTE_LABEL[option]()}
              isSelected={form.remoteOptions.includes(option)}
              onChange={(checked) =>
                setForm((prev) => ({
                  ...prev,
                  remoteOptions: checked
                    ? [...prev.remoteOptions, option]
                    : prev.remoteOptions.filter((value) => value !== option),
                }))
              }
            />
          ))}
        </div>
      </fieldset>
      <div className="flex gap-2">
        <Button type="submit" color="primary" size="sm" isDisabled={status === 'saving'}>
          {status === 'saving' ? m.alertManager_savingLabel() : submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" color="tertiary" size="sm" onClick={onCancel}>
            {m.alertManager_cancelLabel()}
          </Button>
        ) : null}
      </div>
      {status === 'error' ? (
        <p className="text-sm text-error-primary" role="status">
          {m.alertManager_saveError()}
        </p>
      ) : null}
    </form>
  )
}

export function AlertManager({ alerts }: { alerts: Alert[] }) {
  const router = useRouter()
  const [editing, setEditing] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  return (
    <div className="space-y-4" data-test="alert-manager">
      {alerts.length === 0 ? (
        <p className="border-secondary text-tertiary rounded-lg border border-dashed p-10 text-center">
          {m.alertManager_emptyText()}
        </p>
      ) : (
        <ul className="space-y-3">
          {alerts.map((alert) =>
            editing === alert.id ? (
              <li key={alert.id}>
                <AlertForm
                  initial={alert}
                  submitLabel={m.alertManager_saveChangesLabel()}
                  onCancel={() => setEditing(null)}
                  onSubmit={async (body) => {
                    await updateMyAlert({ data: { id: alert.id, body } })
                    setEditing(null)
                    await router.invalidate()
                  }}
                />
              </li>
            ) : (
              <li
                key={alert.id}
                className="border-secondary flex items-start justify-between gap-4 rounded-lg border p-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">
                      {alert.label ?? m.alertManager_allNewJobsLabel()}
                    </p>
                    <Badge size="sm" type="pill-color" color="brand">{alert.frequency}</Badge>
                    {!alert.isActive ? (
                      <Badge size="sm" type="pill-color" color="gray">{m.alertManager_pausedBadge()}</Badge>
                    ) : null}
                  </div>
                  <p className="text-tertiary text-sm">
                    {alert.filters.jobFunctions.length
                      ? alert.filters.jobFunctions.join(', ')
                      : m.alertManager_anyRoleText()}
                    {alert.filters.remoteOptions.length
                      ? ` · ${alert.filters.remoteOptions
                          .map((option) => REMOTE_LABEL[option]?.() ?? option)
                          .join(', ')}`
                      : ''}
                  </p>
                  {alert.lastSentAt ? (
                    <p className="text-tertiary text-xs">
                      {m.alertManager_lastSentText({
                        date: new Date(alert.lastSentAt).toLocaleDateString(),
                      })}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    color="secondary"
                    size="sm"
                    onClick={() => setEditing(alert.id)}
                  >
                    {m.alertManager_editLabel()}
                  </Button>
                  <Button
                    color="tertiary"
                    size="sm"
                    data-test="alert-delete"
                    onClick={async () => {
                      await deleteMyAlert({ data: { id: alert.id } })
                      await router.invalidate()
                    }}
                  >
                    {m.alertManager_deleteLabel()}
                  </Button>
                </div>
              </li>
            )
          )}
        </ul>
      )}

      {creating ? (
        <AlertForm
          initial={null}
          submitLabel={m.alertManager_createAlertLabel()}
          onCancel={() => setCreating(false)}
          onSubmit={async (body) => {
            await createMyAlert({ data: body })
            setCreating(false)
            await router.invalidate()
          }}
        />
      ) : (
        <Button
          color="secondary"
          size="md"
          data-test="alert-create"
          onClick={() => setCreating(true)}
        >
          {m.alertManager_newAlertLabel()}
        </Button>
      )}
    </div>
  )
}
