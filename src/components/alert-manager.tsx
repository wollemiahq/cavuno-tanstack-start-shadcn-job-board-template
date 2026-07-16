'use client';

import { useId, useState } from 'react';

import { useRouter } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { createMyAlert, deleteMyAlert, updateMyAlert } from '../server/account';

import {
  CandidateActionFeedback,
  type CandidateActionFeedbackState,
} from '@/components/candidate-action-feedback';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Empty, EmptyDescription, EmptyHeader } from '@/components/ui/empty';
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@/components/ui/item';
import type { Alert, AlertBody } from '@cavuno/board';

const REMOTE_OPTIONS = ['on_site', 'hybrid', 'remote'] as const;
const REMOTE_LABEL: Record<string, () => string> = {
  on_site: m.alertManager_remoteOnSite,
  hybrid: m.alertManager_remoteHybrid,
  remote: m.alertManager_remoteRemote,
};

interface FormState {
  label: string;
  jobFunctions: string;
  remoteOptions: string[];
}

function toBody(form: FormState, initial: Alert | null): AlertBody {
  const jobFunctions = form.jobFunctions
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const filters = initial?.filters;
  return {
    ...(form.label.trim() ? { label: form.label.trim() } : {}),
    frequency: 'weekly',
    ...(jobFunctions.length ? { jobFunctions } : {}),
    ...(form.remoteOptions.length ? { remoteOptions: form.remoteOptions } : {}),
    // `update` is a whole-object PUT — round-trip the filters this simplified
    // UI doesn't edit (seniority / places / salary) so editing the visible
    // fields doesn't silently wipe them.
    ...(filters?.seniorityLevels.length
      ? { seniorityLevels: filters.seniorityLevels }
      : {}),
    ...(filters?.placeIds.length ? { placeIds: filters.placeIds } : {}),
    ...(filters?.salaryMin != null ? { salaryMin: filters.salaryMin } : {}),
    ...(filters?.salaryMax != null ? { salaryMax: filters.salaryMax } : {}),
    ...(filters?.salaryCurrency != null
      ? { salaryCurrency: filters.salaryCurrency }
      : {}),
  };
}

function fromAlert(alert: Alert | null): FormState {
  return {
    label: alert?.label ?? '',
    jobFunctions: alert?.filters.jobFunctions.join(', ') ?? '',
    remoteOptions: alert?.filters.remoteOptions ?? [],
  };
}

function AlertForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: Alert | null;
  submitLabel: string;
  onSubmit: (body: AlertBody) => Promise<void>;
  onCancel?: () => void;
}) {
  const id = useId();
  const [form, setForm] = useState<FormState>(() => fromAlert(initial));
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle');

  return (
    <Card size="sm">
      <CardContent>
        <form
          data-test="alert-form"
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setStatus('saving');
            try {
              await onSubmit(toBody(form, initial));
              setStatus('idle');
            } catch {
              setStatus('error');
            }
          }}
        >
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor={`${id}-name`}>
                {m.alertManager_nameLabel()}
              </FieldLabel>
              <Input
                id={`${id}-name`}
                name="label"
                value={form.label}
                placeholder={m.alertManager_namePlaceholder()}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, label: event.target.value }))
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${id}-roles`}>
                {m.alertManager_rolesLabel()}
              </FieldLabel>
              <Input
                id={`${id}-roles`}
                name="jobFunctions"
                value={form.jobFunctions}
                placeholder={m.alertManager_rolesPlaceholder()}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    jobFunctions: event.target.value,
                  }))
                }
              />
            </Field>
            <FieldSet>
              <FieldLegend variant="label">
                {m.alertManager_remoteOptionsLegend()}
              </FieldLegend>
              <FieldGroup className="flex-row flex-wrap gap-4">
                {REMOTE_OPTIONS.map((option) => {
                  const optionId = `${id}-${option}`;
                  return (
                    <Field
                      key={option}
                      orientation="horizontal"
                      className="w-auto"
                    >
                      <Checkbox
                        id={optionId}
                        name="remoteOptions"
                        value={option}
                        checked={form.remoteOptions.includes(option)}
                        onCheckedChange={(checked) =>
                          setForm((prev) => ({
                            ...prev,
                            remoteOptions: checked
                              ? [...prev.remoteOptions, option]
                              : prev.remoteOptions.filter(
                                  (value) => value !== option,
                                ),
                          }))
                        }
                      />
                      <FieldLabel htmlFor={optionId} className="font-normal">
                        {REMOTE_LABEL[option]()}
                      </FieldLabel>
                    </Field>
                  );
                })}
              </FieldGroup>
            </FieldSet>
          </FieldGroup>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={status === 'saving'}>
              {status === 'saving' ? m.alertManager_savingLabel() : submitLabel}
            </Button>
            {onCancel ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onCancel}
              >
                {m.alertManager_cancelLabel()}
              </Button>
            ) : null}
          </div>
          <CandidateActionFeedback
            state={status === 'error' ? 'error' : 'idle'}
          />
        </form>
      </CardContent>
    </Card>
  );
}

export function AlertManager({ alerts }: { alerts: Alert[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [feedback, setFeedback] =
    useState<CandidateActionFeedbackState>('idle');

  return (
    <div className="space-y-4" data-test="alert-manager">
      {alerts.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyDescription>{m.alertManager_emptyText()}</EmptyDescription>
          </EmptyHeader>
        </Empty>
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
                    setFeedback('idle');
                    await updateMyAlert({ data: { id: alert.id, body } });
                    setEditing(null);
                    await router.invalidate();
                    setFeedback('success');
                  }}
                />
              </li>
            ) : (
              <li key={alert.id}>
                <Item variant="outline">
                  <ItemContent>
                    <ItemTitle className="flex-wrap">
                      <span>
                        {alert.label ?? m.alertManager_allNewJobsLabel()}
                      </span>
                      <Badge>{m.alertManager_frequencyWeekly()}</Badge>
                      {!alert.isActive ? (
                        <Badge variant="secondary">
                          {m.alertManager_pausedBadge()}
                        </Badge>
                      ) : null}
                    </ItemTitle>
                    <ItemDescription>
                      {alert.filters.jobFunctions.length
                        ? alert.filters.jobFunctions.join(', ')
                        : m.alertManager_anyRoleText()}
                      {alert.filters.remoteOptions.length
                        ? ` · ${alert.filters.remoteOptions
                            .map((option) => REMOTE_LABEL[option]?.() ?? option)
                            .join(', ')}`
                        : ''}
                    </ItemDescription>
                    {alert.lastSentAt ? (
                      <p className="text-muted-foreground text-xs">
                        {m.alertManager_lastSentText({
                          date: new Date(alert.lastSentAt).toLocaleDateString(),
                        })}
                      </p>
                    ) : null}
                  </ItemContent>
                  <ItemActions className="self-start">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditing(alert.id)}
                    >
                      {m.alertManager_editLabel()}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      data-test="alert-delete"
                      disabled={pendingDeleteId !== null}
                      onClick={async () => {
                        setPendingDeleteId(alert.id);
                        setFeedback('idle');
                        try {
                          await deleteMyAlert({ data: { id: alert.id } });
                          await router.invalidate();
                          setFeedback('success');
                        } catch {
                          setFeedback('error');
                        } finally {
                          setPendingDeleteId(null);
                        }
                      }}
                    >
                      {m.alertManager_deleteLabel()}
                    </Button>
                  </ItemActions>
                </Item>
              </li>
            ),
          )}
        </ul>
      )}

      <CandidateActionFeedback state={feedback} />

      {creating ? (
        <AlertForm
          initial={null}
          submitLabel={m.alertManager_createAlertLabel()}
          onCancel={() => setCreating(false)}
          onSubmit={async (body) => {
            setFeedback('idle');
            await createMyAlert({ data: body });
            setCreating(false);
            await router.invalidate();
            setFeedback('success');
          }}
        />
      ) : (
        <Button
          variant="outline"
          data-test="alert-create"
          onClick={() => setCreating(true)}
        >
          {m.alertManager_newAlertLabel()}
        </Button>
      )}
    </div>
  );
}
