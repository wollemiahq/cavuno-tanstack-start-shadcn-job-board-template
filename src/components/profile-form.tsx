'use client';

import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';

import { countryOptions } from '@cavuno/board/format';
import { useRouter } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { checkHandle, updateProfile } from '../server/account';
import {
  listProfileObjectReferenceChoices,
  updateProfileCustomFields,
  updateProfileObjectReferences,
} from '../server/form-fields';

import { customFieldLabel } from '@/board/custom-field-labels';
import {
  TALENT_FORM_BUILTINS,
  formEntryKey,
  layoutRows,
  ownerProfileDefinitions,
  requiresBuiltin,
  resolveProfileFormLayout,
  showsBuiltin,
  type ProfileFormEntry,
  type TalentFormBuiltinKey,
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
import type { LocationSuggestionState } from '@/components/location-combobox';
import { LocationSuggestField } from '@/components/location-suggest-field';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  reconcileCommittedAction,
  toastActionError,
  toastActionReconciliationError,
  toastActionSuccess,
} from '@/lib/action-toast';
import {
  handleFromName,
  handleProblem,
  normalizeHandleInput,
  suggestedHandle,
} from '@/lib/candidate-handle';
import { searchString } from '@/lib/pagination';
import type {
  CandidateProfile,
  ProfileFieldValues,
  ProfileObjectReferences,
} from '@cavuno/board';

type FormState = {
  displayName: string;
  handle: string;
  headline: string;
  location: string;
  /** ISO 3166-1 alpha-2 country selected explicitly by the candidate. */
  countryCode: string | null;
  bio: string;
  profileVisibility: CandidateProfile['profileVisibility'];
  jobSearchStatus: CandidateProfile['jobSearchStatus'];
  jobSearchStatusVisibleTo: CandidateProfile['jobSearchStatusVisibleTo'];
  openToRelocate: boolean;
};

type CandidateProfileWithCountry = CandidateProfile & {
  countryCode?: string | null;
};

function toForm(profile: CandidateProfileWithCountry): FormState {
  return {
    displayName: profile.displayName ?? '',
    // A profile without a handle starts from one suggested by the name.
    handle: profile.handle ?? suggestedHandle(profile.displayName ?? ''),
    headline: profile.headline ?? '',
    location: profile.location ?? '',
    countryCode: profile.countryCode ?? null,
    bio: profile.bio ?? '',
    profileVisibility: profile.profileVisibility,
    jobSearchStatus: profile.jobSearchStatus,
    jobSearchStatusVisibleTo: profile.jobSearchStatusVisibleTo,
    openToRelocate: profile.openToRelocate,
  };
}

type Status = 'idle' | 'saving';
/** The availability answer for one handle, from the live probe or a save. */
type HandleCheck = {
  handle: string;
  status: 'checking' | 'available' | 'taken';
};

/** How long typing pauses before the handle's availability is probed. */
const HANDLE_CHECK_DELAY_MS = 500;
type VisibilityLabels = Record<CandidateProfile['profileVisibility'], string>;
type SearchStatusLabels = Record<CandidateProfile['jobSearchStatus'], string>;
type VisibleToLabels = Record<
  CandidateProfile['jobSearchStatusVisibleTo'],
  string
>;

const PROFILE_VISIBILITIES = [
  'public',
  'logged_in_only',
  'hidden',
] as const satisfies readonly CandidateProfile['profileVisibility'][];

const JOB_SEARCH_STATUSES = [
  'actively_looking',
  'open_to_offers',
  'not_looking',
] as const satisfies readonly CandidateProfile['jobSearchStatus'][];

const JOB_SEARCH_STATUS_VISIBLE_TO = [
  'everyone',
  'employers_only',
] as const satisfies readonly CandidateProfile['jobSearchStatusVisibleTo'][];

function profileVisibilityChoice(
  value: string | null | undefined,
): CandidateProfile['profileVisibility'] | undefined {
  return PROFILE_VISIBILITIES.find((option) => option === value);
}

function jobSearchStatusChoice(
  value: string | null | undefined,
): CandidateProfile['jobSearchStatus'] | undefined {
  return JOB_SEARCH_STATUSES.find((option) => option === value);
}

function jobSearchStatusVisibleToChoice(
  value: string | null | undefined,
): CandidateProfile['jobSearchStatusVisibleTo'] | undefined {
  return JOB_SEARCH_STATUS_VISIBLE_TO.find((option) => option === value);
}

export interface ProfileFormDependencies {
  checkHandle: (
    input: Parameters<typeof checkHandle>[0],
  ) => ReturnType<typeof checkHandle>;
  updateProfile: (
    input: Parameters<typeof updateProfile>[0],
  ) => ReturnType<typeof updateProfile>;
  toastActionError: () => void | Promise<void>;
  toastActionReconciliationError: () => void | Promise<void>;
  toastActionSuccess: () => void | Promise<void>;
  /** Custom field and collection writes; the server functions by default. */
  updateCustomFields?: (
    input: Parameters<typeof updateProfileCustomFields>[0],
  ) => ReturnType<typeof updateProfileCustomFields>;
  updateObjectReferences?: (
    input: Parameters<typeof updateProfileObjectReferences>[0],
  ) => ReturnType<typeof updateProfileObjectReferences>;
  listObjectReferenceChoices?: (
    input: Parameters<typeof listProfileObjectReferenceChoices>[0],
  ) => Promise<{ data: { id: string; name: string }[] }>;
}

export type TalentFormEntry = ProfileFormEntry<TalentFormBuiltinKey>;

/** The profile sections that render outside this form, as layout keys. */
export type TalentSectionKey =
  | 'experience'
  | 'education'
  | 'skills'
  | 'languages';

/** Built-ins this form does not draw: the avatar and the sections. */
const OUTSIDE_FORM: ReadonlySet<TalentFormBuiltinKey> = new Set([
  'avatar',
  'email',
  'experience',
  'education',
  'skills',
  'languages',
]);

/** The owner's editable custom fields and collection selections. */
export type TalentProfileFields = {
  customFields: ProfileFieldValues | null;
  objectReferences: ProfileObjectReferences | null;
};

/**
 * The candidate profile to render, in order: the operator's talent form
 * (`forms.talent`), or the pre-layout order on an older API. Only
 * owner-editable custom and collection fields with an input here become
 * entries.
 */
export function resolveTalentForm(
  layout: Parameters<typeof resolveProfileFormLayout>[0],
  fields: TalentProfileFields | null | undefined,
): TalentFormEntry[] {
  return resolveProfileFormLayout(
    layout,
    TALENT_FORM_BUILTINS,
    ownerProfileDefinitions(fields),
  ).filter(
    (entry) => entry.kind !== 'custom' || hasCustomFieldInput(entry.definition),
  );
}

const profileFormDependencies: ProfileFormDependencies = {
  checkHandle,
  updateProfile,
  toastActionError,
  toastActionReconciliationError,
  toastActionSuccess,
};

/**
 * Profile edit form — recreates the hosted `/account` profile editor. One
 * merge-patch via `board.me.profile.update`. The handle is required: it
 * follows the name until the candidate edits it (when none is stored), is
 * checked for format before a save, and its availability is probed while
 * typing (`board.me.profile.handleAvailable`). The display-name field is
 * part of the same patch (the SDK hides the two-mutation split).
 */
export function ProfileForm({
  profile,
  locationSuggestions,
  language,
  profileFields = null,
  entries = resolveTalentForm(null, profileFields),
  sectionCounts = {},
  dependencies = profileFormDependencies,
}: {
  profile: CandidateProfile;
  locationSuggestions: LocationSuggestionState;
  language: string;
  /** Owner-editable custom fields and collection selections, when readable. */
  profileFields?: TalentProfileFields | null;
  /** The talent form to render (`resolveTalentForm`); pre-layout by default. */
  entries?: readonly TalentFormEntry[];
  /** How many items each profile section holds, for its required check. */
  sectionCounts?: Partial<Record<TalentSectionKey, number>>;
  dependencies?: ProfileFormDependencies;
}) {
  const visibilityLabels = {
    public: m.profileForm_visibilityPublic(),
    logged_in_only: m.profileForm_visibilityLoggedInOnly(),
    hidden: m.profileForm_visibilityHidden(),
  } satisfies VisibilityLabels;
  const searchStatusLabels = {
    actively_looking: m.profileForm_searchStatusActivelyLooking(),
    open_to_offers: m.profileForm_searchStatusOpenToOffers(),
    not_looking: m.profileForm_searchStatusNotLooking(),
  } satisfies SearchStatusLabels;
  const visibleToLabels = {
    everyone: m.profileForm_visibleToEveryone(),
    employers_only: m.profileForm_visibleToEmployersOnly(),
  } satisfies VisibleToLabels;

  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => toForm(profile));
  const countries = countryOptions(language);
  const [status, setStatus] = useState<Status>('idle');

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setStatus('idle');
  };

  const storedHandle = profile.handle ?? '';
  const handleInput = useRef<HTMLInputElement>(null);
  const locationInput = useRef<HTMLInputElement>(null);
  // Typed location text is a search until a suggestion is picked; a saved
  // location is whatever the profile already had, so it starts settled.
  const [locationUnpicked, setLocationUnpicked] = useState(false);
  const [locationPickError, setLocationPickError] = useState(false);
  // The handle follows the display name until the candidate types one.
  const [handleFollowsName, setHandleFollowsName] = useState(!profile.handle);
  // Format problems show once the candidate edits the handle or saves.
  const [handleShowsProblem, setHandleShowsProblem] = useState(false);
  const [handleCheck, setHandleCheck] = useState<HandleCheck | null>(null);
  const probeHandle = dependencies.checkHandle;

  useEffect(() => {
    const handle = form.handle;
    if (handle === storedHandle || handleProblem(handle)) return;
    let current = true;
    const timer = setTimeout(async () => {
      setHandleCheck({ handle, status: 'checking' });
      try {
        const result = await probeHandle({ data: { handle } });
        if (current) {
          setHandleCheck({
            handle,
            status: result.available ? 'available' : 'taken',
          });
        }
      } catch {
        if (current) setHandleCheck(null);
      }
    }, HANDLE_CHECK_DELAY_MS);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [form.handle, storedHandle, probeHandle]);

  const handleAvailability =
    handleCheck?.handle === form.handle && form.handle !== storedHandle
      ? handleCheck.status
      : null;
  const handleIssue =
    handleProblem(form.handle) ??
    (handleAvailability === 'taken' ? 'taken' : null);
  const shownHandleIssue =
    handleIssue === 'taken' || handleShowsProblem ? handleIssue : null;

  const shows = (key: TalentFormBuiltinKey) => showsBuiltin(entries, key);
  const requires = (key: TalentFormBuiltinKey) => requiresBuiltin(entries, key);
  const inlineEntries = entries.filter(
    (entry) => entry.kind !== 'builtin' || !OUTSIDE_FORM.has(entry.key),
  );
  const storedValues = profileFields?.customFields?.values ?? {};
  const storedSelections = profileFields?.objectReferences?.selections ?? [];
  const [customValues, setCustomValues] =
    useState<Record<string, ProfileFieldValue>>(storedValues);
  const [selections, setSelections] = useState<ProfileSelections>(() =>
    initialProfileSelections(storedSelections),
  );
  const [invalid, setInvalid] = useState<{
    id: string;
    message: string;
  } | null>(null);

  /**
   * The label of a required built-in left empty, or `null` when it has a
   * value (or has nothing to fill in, like the job search status).
   */
  function emptyBuiltinLabel(key: TalentFormBuiltinKey): string | null {
    switch (key) {
      case 'name':
        return form.displayName.trim()
          ? null
          : m.profileForm_displayNameLabel();
      case 'headline':
        return form.headline.trim() ? null : m.profileForm_headlineLabel();
      case 'location':
        return form.location.trim() ? null : m.profileForm_locationLabel();
      case 'bio':
        return form.bio.trim() ? null : m.profileForm_bioLabel();
      case 'avatar':
        return profile.avatarUrl
          ? null
          : m.profileCompleteness_itemPhotoLabel();
      case 'experience':
        return sectionCounts.experience === 0
          ? m.experienceSection_heading()
          : null;
      case 'education':
        return sectionCounts.education === 0
          ? m.educationSection_heading()
          : null;
      case 'skills':
        return sectionCounts.skills === 0 ? m.skillsSection_heading() : null;
      case 'languages':
        return sectionCounts.languages === 0
          ? m.languagesSection_heading()
          : null;
      default:
        return null;
    }
  }

  /**
   * The first required field left empty, in form order. The sections and the
   * photo save on their own, so a required one blocks this save until it
   * has an entry, naming what is missing.
   */
  function missingRequired(): { id: string; message: string } | null {
    for (const entry of entries) {
      if (!entry.required) continue;
      if (entry.kind === 'builtin') {
        const field = emptyBuiltinLabel(entry.key);
        if (field !== null) {
          return {
            id: formEntryKey(entry),
            message: m.profileForm_fieldRequiredError({ field }),
          };
        }
        continue;
      }
      const empty =
        entry.kind === 'custom'
          ? entry.definition.type !== 'boolean' &&
            isCustomFieldEmpty(customValues[entry.key])
          : (selections[entry.key]?.length ?? 0) === 0;
      if (empty) {
        return {
          id: formEntryKey(entry),
          message: m.profileForm_fieldRequiredError({
            field: customFieldLabel(entry.definition),
          }),
        };
      }
    }
    return null;
  }

  async function loadChoices(fieldKey: string, search: string) {
    const result = await (
      dependencies.listObjectReferenceChoices ??
      listProfileObjectReferenceChoices
    )({ data: { fieldKey, search: search || undefined, limit: 25 } });
    return result.data.map(({ id, name }) => ({ id, name }));
  }

  async function save() {
    const missing = missingRequired();
    setInvalid(missing);
    setHandleShowsProblem(true);
    if (handleIssue) {
      handleInput.current?.focus();
      return;
    }
    if (shows('location') && locationUnpicked && form.location.trim()) {
      setLocationPickError(true);
      locationInput.current?.focus();
      return;
    }
    if (missing) return;
    setStatus('saving');
    const handle = form.handle;
    try {
      // A merge-patch: a built-in the layout hides is not sent, so the value
      // already stored on the profile is kept.
      const data: Parameters<typeof updateProfile>[0]['data'] = {
        // This is deliberately independent of the free-text location:
        // no locale parsing or backfill can turn an ambiguous historic
        // location into an eligibility decision.
        countryCode: form.countryCode,
        profileVisibility: form.profileVisibility,
        openToRelocate: form.openToRelocate,
      };
      if (shows('name')) data.displayName = form.displayName.trim();
      data.handle = handle;
      if (shows('headline')) data.headline = form.headline.trim();
      if (shows('location')) data.location = form.location.trim();
      if (shows('bio')) data.bio = form.bio.trim();
      if (shows('jobSearchStatus')) {
        data.jobSearchStatus = form.jobSearchStatus;
        data.jobSearchStatusVisibleTo = form.jobSearchStatusVisibleTo;
      }
      const result = await dependencies.updateProfile({ data });
      if (!result.ok) {
        // Another candidate took the handle since the last probe.
        setStatus('idle');
        setHandleCheck({ handle, status: 'taken' });
        handleInput.current?.focus();
        return;
      }
      const values = profileCustomFieldsBody(
        inlineEntries.flatMap((entry) =>
          entry.kind === 'custom' ? [entry.key] : [],
        ),
        customValues,
        storedValues,
      );
      if (values) {
        await (dependencies.updateCustomFields ?? updateProfileCustomFields)({
          data: { values },
        });
      }
      const references = profileObjectReferencesBody(
        inlineEntries.flatMap((entry) =>
          entry.kind === 'collection' ? [entry.key] : [],
        ),
        selections,
        storedSelections,
        profileFields?.objectReferences?.definitions ?? [],
      );
      if (references) {
        await (
          dependencies.updateObjectReferences ?? updateProfileObjectReferences
        )({ data: references });
      }
    } catch {
      setStatus('idle');
      void dependencies.toastActionError();
      return;
    }
    setStatus('idle');
    void dependencies.toastActionSuccess();
    await reconcileCommittedAction(
      () => router.invalidate(),
      dependencies.toastActionReconciliationError,
    );
  }

  // Neither the country nor the profile visibility is a layout field: they
  // ride with the location and the job search status, and keep a place of
  // their own when those are hidden.
  const countryField = (
    <Field className="gap-1.5">
      <FieldLabel htmlFor="profile-country">
        {m.profileForm_countryLabel()}
      </FieldLabel>
      <NativeSelect
        id="profile-country"
        className="w-full"
        value={form.countryCode ?? ''}
        onChange={(event) => set('countryCode', event.target.value || null)}
      >
        <NativeSelectOption value="">
          {m.profileForm_countryNotSpecified()}
        </NativeSelectOption>
        {countries.map((country) => (
          <NativeSelectOption key={country.code} value={country.code}>
            {country.name}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <FieldDescription>{m.profileForm_countryDescription()}</FieldDescription>
    </Field>
  );
  const visibilityField = (
    <Field className="gap-1.5">
      <FieldLabel htmlFor="profile-visibility">
        {m.profileForm_visibilityLabel()}
      </FieldLabel>
      <Select
        items={visibilityLabels}
        value={form.profileVisibility}
        onValueChange={(value) => {
          const next = profileVisibilityChoice(searchString(value));
          if (next) set('profileVisibility', next);
        }}
      >
        <SelectTrigger id="profile-visibility" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(visibilityLabels).map(([id, label]) => (
            <SelectItem key={id} value={id}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );

  const handleStatusText =
    shownHandleIssue === 'required'
      ? m.profileForm_handleRequiredError()
      : shownHandleIssue === 'length'
        ? m.profileForm_handleLengthError()
        : shownHandleIssue === 'format'
          ? m.profileForm_handleFormatError()
          : shownHandleIssue === 'taken'
            ? m.profileForm_handleTakenText()
            : handleAvailability === 'checking'
              ? m.profileForm_handleCheckingText()
              : handleAvailability === 'available'
                ? m.profileForm_handleAvailableText()
                : null;
  // The handle is not a layout field: it sits beside the name, or on its own
  // when the layout hides the name.
  const handleField = (
    <Field
      className="gap-1.5"
      data-invalid={shownHandleIssue ? true : undefined}
    >
      <FieldLabel htmlFor="profile-handle">
        {m.profileForm_handleLabel()}
      </FieldLabel>
      <Input
        ref={handleInput}
        id="profile-handle"
        value={form.handle}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        aria-required="true"
        aria-invalid={shownHandleIssue ? true : undefined}
        aria-describedby={
          handleStatusText
            ? 'profile-handle-description profile-handle-status'
            : 'profile-handle-description'
        }
        onChange={(event) => {
          set('handle', normalizeHandleInput(event.target.value));
          setHandleFollowsName(false);
          setHandleShowsProblem(true);
        }}
      />
      <FieldDescription id="profile-handle-description">
        {m.profileForm_handleDescription()}
      </FieldDescription>
      {shownHandleIssue ? (
        <FieldError id="profile-handle-status">{handleStatusText}</FieldError>
      ) : handleStatusText ? (
        <FieldDescription id="profile-handle-status" role="status">
          {handleStatusText}
        </FieldDescription>
      ) : null}
    </Field>
  );

  function renderBuiltin(key: TalentFormBuiltinKey): ReactNode {
    switch (key) {
      case 'name':
        return (
          <>
            <Field className="gap-1.5">
              <FieldLabel htmlFor="profile-display-name">
                {m.profileForm_displayNameLabel()}
              </FieldLabel>
              <Input
                id="profile-display-name"
                value={form.displayName}
                required={requires('name')}
                onChange={(event) => {
                  const displayName = event.target.value;
                  setForm((prev) => ({
                    ...prev,
                    displayName,
                    handle: handleFollowsName
                      ? handleFromName(displayName)
                      : prev.handle,
                  }));
                  setStatus('idle');
                }}
              />
            </Field>
            {handleField}
          </>
        );
      case 'headline':
        return (
          <Field className="gap-1.5">
            <FieldLabel htmlFor="profile-headline">
              {m.profileForm_headlineLabel()}
            </FieldLabel>
            <Input
              id="profile-headline"
              value={form.headline}
              required={requires('headline')}
              placeholder={m.profileForm_headlinePlaceholder()}
              onChange={(event) => set('headline', event.target.value)}
            />
          </Field>
        );
      case 'location':
        return (
          <>
            <Field
              className="gap-1.5"
              data-invalid={locationPickError || undefined}
            >
              <FieldLabel htmlFor="profile-location">
                {m.profileForm_locationLabel()}
              </FieldLabel>
              <LocationSuggestField
                id="profile-location"
                inputRef={locationInput}
                value={form.location}
                placeholder={m.profileForm_locationPlaceholder()}
                searchingText={m.locationCombobox_searchingText()}
                invalid={locationPickError}
                describedBy={
                  locationPickError ? 'profile-location-error' : undefined
                }
                onValueChange={(location) => {
                  set('location', location);
                  setLocationUnpicked(location.trim() !== '');
                  setLocationPickError(false);
                }}
                onPick={(place) => {
                  set('location', place.fullName ?? place.name);
                  setLocationUnpicked(false);
                  setLocationPickError(false);
                }}
                {...locationSuggestions}
              />
              {locationPickError ? (
                <FieldError id="profile-location-error">
                  {m.locationField_pickRequiredError()}
                </FieldError>
              ) : null}
            </Field>
            {countryField}
          </>
        );
      case 'bio':
        return (
          <Field className="gap-1.5">
            <FieldLabel htmlFor="profile-bio">
              {m.profileForm_bioLabel()}
            </FieldLabel>
            <Textarea
              id="profile-bio"
              value={form.bio}
              rows={4}
              required={requires('bio')}
              onChange={(event) => set('bio', event.target.value)}
            />
          </Field>
        );
      case 'jobSearchStatus':
        return (
          <div className="grid gap-4 sm:grid-cols-3">
            {visibilityField}
            <Field className="gap-1.5">
              <FieldLabel htmlFor="profile-search-status">
                {m.profileForm_searchStatusLabel()}
              </FieldLabel>
              <Select
                items={searchStatusLabels}
                value={form.jobSearchStatus}
                onValueChange={(value) => {
                  const next = jobSearchStatusChoice(searchString(value));
                  if (next) set('jobSearchStatus', next);
                }}
              >
                <SelectTrigger id="profile-search-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(searchStatusLabels).map(([id, label]) => (
                    <SelectItem key={id} value={id}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field className="gap-1.5">
              <FieldLabel htmlFor="profile-visible-to">
                {m.profileForm_visibleToLabel()}
              </FieldLabel>
              <Select
                items={visibleToLabels}
                value={form.jobSearchStatusVisibleTo}
                onValueChange={(value) => {
                  const next = jobSearchStatusVisibleToChoice(
                    searchString(value),
                  );
                  if (next) set('jobSearchStatusVisibleTo', next);
                }}
              >
                <SelectTrigger id="profile-visible-to" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(visibleToLabels).map(([id, label]) => (
                    <SelectItem key={id} value={id}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        );
      default:
        // Avatar, email and the profile sections render outside this form.
        return null;
    }
  }

  function renderEntry(entry: TalentFormEntry): ReactNode {
    if (entry.kind === 'builtin') return renderBuiltin(entry.key);
    if (entry.kind === 'custom') {
      return (
        <CustomFieldInput
          definition={entry.definition}
          required={entry.required}
          value={customValues[entry.key]}
          onChange={(value) => {
            setCustomValues((prev) => ({ ...prev, [entry.key]: value }));
            setStatus('idle');
          }}
        />
      );
    }
    return (
      <CollectionFieldPicker
        definition={entry.definition}
        value={selections[entry.key] ?? []}
        onChange={(value) => {
          setSelections((prev) => ({ ...prev, [entry.key]: value }));
          setStatus('idle');
        }}
        loadChoices={(search) => loadChoices(entry.key, search)}
        error={invalid?.id === formEntryKey(entry) ? invalid.message : null}
      />
    );
  }

  // Name, headline and location keep their two-column grid wherever the
  // layout places them next to each other.
  const rows = layoutRows(inlineEntries, (entry) =>
    entry.kind === 'builtin' &&
    (entry.key === 'name' ||
      entry.key === 'headline' ||
      entry.key === 'location')
      ? 'pair'
      : null,
  );

  return (
    <form
      method="post"
      data-test="profile-form"
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        await save();
      }}
    >
      <FieldGroup className="gap-4">
        {rows.map((row) =>
          row.group === 'pair' ? (
            <div
              key={row.entries.map(formEntryKey).join('|')}
              className="grid gap-4 sm:grid-cols-2"
            >
              {row.entries.map((entry) => (
                <Fragment key={formEntryKey(entry)}>
                  {renderEntry(entry)}
                </Fragment>
              ))}
            </div>
          ) : (
            row.entries.map((entry) => (
              <Fragment key={formEntryKey(entry)}>
                {renderEntry(entry)}
              </Fragment>
            ))
          ),
        )}

        {shows('name') ? null : (
          <div className="grid gap-4 sm:grid-cols-2">{handleField}</div>
        )}
        {shows('location') ? null : (
          <div className="grid gap-4 sm:grid-cols-2">{countryField}</div>
        )}
        {shows('jobSearchStatus') ? null : (
          <div className="grid gap-4 sm:grid-cols-3">{visibilityField}</div>
        )}

        <Field orientation="horizontal" className="w-fit">
          <FieldLabel className="cursor-pointer">
            <Checkbox
              checked={form.openToRelocate}
              onCheckedChange={(checked) =>
                set('openToRelocate', checked === true)
              }
            />
            {m.profileForm_openToRelocatingLabel()}
          </FieldLabel>
        </Field>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={status === 'saving'}>
            {status === 'saving'
              ? m.profileForm_savingLabel()
              : m.profileForm_saveLabel()}
          </Button>
          {invalid ? <FieldError>{invalid.message}</FieldError> : null}
        </div>
      </FieldGroup>
    </form>
  );
}
