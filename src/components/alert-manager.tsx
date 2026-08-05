'use client';

import { useId, useMemo, useState } from 'react';

import { useRouter } from '@tanstack/react-router';
import { BellRing } from 'lucide-react';

import { m } from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';
import { createMyAlert, deleteMyAlert, updateMyAlert } from '../server/account';

import type { LocationSuggestionVM } from '@/board/location-suggestion';
import { EmptyState } from '@/components/empty-state';
import { PlaceTagsField } from '@/components/place-tags-field';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Field,
  FieldDescription,
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { toastActionError, toastActionSuccess } from '@/lib/action-toast';
import type { Alert, AlertBody } from '@cavuno/board';

const REMOTE_OPTIONS = ['on_site', 'hybrid', 'remote'] as const;
const REMOTE_LABEL: Record<string, () => string> = {
  on_site: m.alertManager_remoteOnSite,
  hybrid: m.alertManager_remoteHybrid,
  remote: m.alertManager_remoteRemote,
};

/** One board place from the directory (the alert filter option space). */
export type AlertPlaceOption = {
  id: string;
  slug: string | null;
  name: string;
};

/** Resolved place-id → display-name map from the board places directory. */
export type PlaceNameMap = Record<string, string>;

interface FormState {
  label: string;
  jobFunctions: string;
  remoteOptions: string[];
  places: { id: string; name: string }[];
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
    ...(form.places.length
      ? { placeIds: form.places.map((place) => place.id) }
      : {}),
    // `update` is a whole-object PUT — round-trip the filters this simplified
    // UI doesn't edit (seniority / salary) so editing the visible fields
    // doesn't silently wipe them.
    ...(filters?.seniorityLevels.length
      ? { seniorityLevels: filters.seniorityLevels }
      : {}),
    ...(filters?.salaryMin != null ? { salaryMin: filters.salaryMin } : {}),
    ...(filters?.salaryMax != null ? { salaryMax: filters.salaryMax } : {}),
    ...(filters?.salaryCurrency != null
      ? { salaryCurrency: filters.salaryCurrency }
      : {}),
  };
}

function fromAlert(alert: Alert | null, placeNames: PlaceNameMap): FormState {
  return {
    label: alert?.label ?? '',
    jobFunctions: alert?.filters.jobFunctions.join(', ') ?? '',
    // A new alert starts with every workplace type — matching everything,
    // narrowed by unticking.
    remoteOptions: alert ? alert.filters.remoteOptions : [...REMOTE_OPTIONS],
    places: (alert?.filters.placeIds ?? []).map((id) => ({
      id,
      name: placeNames[id] ?? id,
    })),
  };
}

function AlertForm({
  initial,
  placeNames,
  places,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: Alert | null;
  placeNames: PlaceNameMap;
  places: AlertPlaceOption[];
  submitLabel: string;
  onSubmit: (body: AlertBody) => Promise<void>;
  onCancel?: () => void;
}) {
  const id = useId();
  const [form, setForm] = useState<FormState>(() =>
    fromAlert(initial, placeNames),
  );
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  // The board places directory is bounded and already loaded — the picker
  // lists it on focus and filters client-side, same behavior as the post
  // form's geographic restriction.
  const [placeQuery, setPlaceQuery] = useState('');
  const placeChoices = useMemo(
    () =>
      places.map((place) => ({
        id: place.id,
        slug: place.slug ?? place.id,
        name: place.name,
        contextLabel: null,
        countryCode: null,
        regionCode: null,
      })),
    [places],
  );
  const placeSuggestions = useMemo(() => {
    const query = placeQuery.trim().toLowerCase();
    if (!query) return placeChoices;
    return placeChoices.filter((place) =>
      place.name.toLowerCase().includes(query),
    );
  }, [placeChoices, placeQuery]);

  // The location filter reveals once the alert names a workplace type (or
  // already carries places) — "remote in Germany", "on-site in Munich".
  const showLocations = form.remoteOptions.length > 0 || form.places.length > 0;

  return (
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
          void toastActionError();
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
                <Field key={option} orientation="horizontal" className="w-auto">
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
        {showLocations ? (
          <Field>
            <FieldLabel htmlFor={`${id}-locations`}>
              {m.alertManager_locationsLabel()}
            </FieldLabel>
            <PlaceTagsField
              id={`${id}-locations`}
              tags={form.places.map((place) => ({
                key: place.id,
                label: place.name,
              }))}
              onAddSuggestion={(place: LocationSuggestionVM) =>
                setForm((prev) =>
                  prev.places.some((entry) => entry.id === place.id)
                    ? prev
                    : {
                        ...prev,
                        places: [
                          ...prev.places,
                          { id: place.id, name: place.name },
                        ],
                      },
                )
              }
              onRemove={(key) =>
                setForm((prev) => ({
                  ...prev,
                  places: prev.places.filter((place) => place.id !== key),
                }))
              }
              placeholder={m.alertManager_locationsPlaceholder()}
              searchingText={m.locationCombobox_searchingText()}
              removeAriaLabel={(name) => m.placeTags_removeAriaLabel({ name })}
              suggestions={placeSuggestions}
              loading={false}
              onQueryChange={setPlaceQuery}
            />
            <FieldDescription>
              {m.alertManager_locationsHelperText()}
            </FieldDescription>
          </Field>
        ) : null}
      </FieldGroup>
      {/* Overlay editors right-align their footer, Cancel before the
          primary — the Dialog/Sheet/AlertDialog convention. */}
      <div className="flex justify-end gap-2">
        {onCancel ? (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            {m.alertManager_cancelLabel()}
          </Button>
        ) : null}
        <Button type="submit" size="sm" disabled={status === 'saving'}>
          {status === 'saving' ? m.alertManager_savingLabel() : submitLabel}
        </Button>
      </div>
    </form>
  );
}

export function AlertManager({
  alerts,
  places,
}: {
  alerts: Alert[];
  places: AlertPlaceOption[];
}) {
  const placeNames: PlaceNameMap = useMemo(
    () => Object.fromEntries(places.map((place) => [place.id, place.name])),
    [places],
  );
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const editingAlert = alerts.find((alert) => alert.id === editing) ?? null;

  const describeAlert = (alert: Alert) => {
    const parts = [
      alert.filters.jobFunctions.length
        ? alert.filters.jobFunctions.join(', ')
        : m.alertManager_anyRoleText(),
    ];
    if (alert.filters.remoteOptions.length) {
      parts.push(
        alert.filters.remoteOptions
          .map((option) => REMOTE_LABEL[option]?.() ?? option)
          .join(', '),
      );
    }
    if (alert.filters.placeIds.length) {
      parts.push(
        alert.filters.placeIds.map((id) => placeNames[id] ?? id).join(', '),
      );
    }
    return parts.join(' · ');
  };

  const newAlertButton = (
    <Button
      variant="outline"
      data-test="alert-create"
      onClick={() => setCreating(true)}
    >
      {m.alertManager_newAlertLabel()}
    </Button>
  );

  return (
    <div className="space-y-4" data-test="alert-manager">
      {alerts.length === 0 ? (
        <EmptyState
          icon={<BellRing aria-hidden="true" />}
          title={m.meAlerts_title()}
          description={m.alertManager_emptyText()}
          action={newAlertButton}
        />
      ) : (
        <>
          <ul className="space-y-3">
            {alerts.map((alert) => (
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
                    <ItemDescription>{describeAlert(alert)}</ItemDescription>
                    {alert.lastSentAt ? (
                      <p className="text-muted-foreground text-xs">
                        {m.alertManager_lastSentText({
                          date: new Date(alert.lastSentAt).toLocaleDateString(
                            getLocale(),
                          ),
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
                        try {
                          await deleteMyAlert({ data: { id: alert.id } });
                          await router.invalidate();
                          void toastActionSuccess();
                        } catch {
                          void toastActionError();
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
            ))}
          </ul>
          {newAlertButton}
        </>
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{m.alertManager_newAlertLabel()}</DialogTitle>
          </DialogHeader>
          <AlertForm
            key={creating ? 'open' : 'closed'}
            initial={null}
            placeNames={placeNames}
            places={places}
            submitLabel={m.alertManager_createAlertLabel()}
            onCancel={() => setCreating(false)}
            onSubmit={async (body) => {
              await createMyAlert({ data: body });
              setCreating(false);
              await router.invalidate();
              void toastActionSuccess();
            }}
          />
        </DialogContent>
      </Dialog>

      <Sheet
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{m.alertManager_editAlertTitle()}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-4 pt-2">
            {editingAlert ? (
              <AlertForm
                key={editingAlert.id}
                initial={editingAlert}
                placeNames={placeNames}
                places={places}
                submitLabel={m.alertManager_saveChangesLabel()}
                onCancel={() => setEditing(null)}
                onSubmit={async (body) => {
                  await updateMyAlert({ data: { id: editingAlert.id, body } });
                  setEditing(null);
                  await router.invalidate();
                  void toastActionSuccess();
                }}
              />
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
