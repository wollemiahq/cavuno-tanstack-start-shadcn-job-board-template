'use client';

import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';

import { countryOptions, distanceUnitForCountry } from '@cavuno/board/format';
import { useRouter } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { checkHandle, updateProfile } from '../server/account';
import {
  listProfileObjectReferenceChoices,
  updateProfileCustomFields,
  updateProfileObjectReferences,
} from '../server/form-fields';

import {
  commuteRadiusBounds,
  commuteRadiusFromDisplay,
  commuteRadiusToDisplay,
  effectiveCommuteRadiusKm,
  parseCommuteRadius,
  takesCommuteRadius,
  type HomePlace,
} from '@/board/commute-radius';
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
import { useRootSession } from '@/components/root-session';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  reconcileCommittedAction,
  toastActionError,
  toastActionReconciliationError,
  toastActionSuccess,
} from '@/lib/action-toast';
import { boardErrorMessage } from '@/lib/board-error-message';
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

/** The stored home place, as the place the form measures commutes from. */
function toHomePlace(
  place: CandidateProfile['locationPlace'],
): HomePlace | null {
  return place
    ? {
        id: place.id,
        countryCode: place.countryCode,
        placeType: place.placeType,
        city: place.city,
        name: place.name,
      }
    : null;
}

/** A commute distance the candidate typed, in the unit it was typed in. */
type CommuteDraft = { text: string; unit: 'mi' | 'km' };

/** A typed distance re-expressed in `unit`; unparseable text is kept. */
function convertCommuteText(
  draft: CommuteDraft,
  unit: CommuteDraft['unit'],
): string {
  const value = draft.text.trim() === '' ? Number.NaN : Number(draft.text);
  if (!Number.isFinite(value)) return draft.text;
  return String(
    commuteRadiusToDisplay(commuteRadiusFromDisplay(value, draft.unit), unit),
  );
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
  const { refreshSession } = useRootSession();
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
  // A location refused by the API on save (unknown id, lookup down).
  const [locationSaveError, setLocationSaveError] = useState<string | null>(
    null,
  );
  // The place commutes are measured from: the stored one, a fresh pick, or
  // none once the candidate types over it.
  const [homePlace, setHomePlace] = useState<HomePlace | null>(() =>
    toHomePlace(profile.locationPlace),
  );
  const storedHomePlaceId = profile.locationPlace?.id ?? null;
  const commuteInput = useRef<HTMLInputElement>(null);
  // `null` until the candidate edits the distance; an untouched field saves
  // nothing, so the stored value (or the market default) stays.
  const [commuteDraft, setCommuteDraft] = useState<CommuteDraft | null>(null);
  const [commuteError, setCommuteError] = useState(false);
  // The handle follows the display name until the candidate types one.
  const [handleFollowsName, setHandleFollowsName] = useState(!profile.handle);
  const incomingOverview = {
    displayName: profile.displayName ?? '',
    headline: profile.headline ?? '',
    location: profile.location ?? '',
    bio: profile.bio ?? '',
  };
  const [committedOverview, setCommittedOverview] = useState(incomingOverview);
  const overviewKeys = ['displayName', 'headline', 'location', 'bio'] as const;
  if (
    overviewKeys.some((key) => incomingOverview[key] !== committedOverview[key])
  ) {
    // Polling can commit an imported overview while this editor stays mounted.
    // Only pristine fields follow it; manual drafts and unrelated state stay put.
    setCommittedOverview(incomingOverview);
    if (
      incomingOverview.location !== committedOverview.location &&
      form.location === committedOverview.location
    ) {
      setLocationUnpicked(false);
      setLocationPickError(false);
      setLocationSaveError(null);
      setHomePlace(toHomePlace(profile.locationPlace));
    }
    setForm((draft) => {
      const next = { ...draft };
      for (const key of overviewKeys) {
        if (draft[key] === committedOverview[key])
          next[key] = incomingOverview[key];
      }
      if (handleFollowsName && next.displayName !== draft.displayName) {
        next.handle = handleFromName(next.displayName);
      }
      return next;
    });
  }

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

  const showsCommuteRadius = takesCommuteRadius(homePlace);
  // A home place (saved or picked) decides the country on the server.
  const showsCountry = homePlace === null;
  const commuteUnit = distanceUnitForCountry(homePlace?.countryCode);
  const commuteBounds = commuteRadiusBounds(commuteUnit);
  const unitLabel = (unit: CommuteDraft['unit']) =>
    unit === 'mi'
      ? m.profileForm_commuteRadiusMilesUnit()
      : m.profileForm_commuteRadiusKilometresUnit();
  // An edited distance keeps its length when a new home place changes the
  // unit; an untouched one shows the saved distance or the market default.
  const commuteText = commuteDraft
    ? commuteDraft.unit === commuteUnit
      ? commuteDraft.text
      : convertCommuteText(commuteDraft, commuteUnit)
    : String(
        commuteRadiusToDisplay(
          effectiveCommuteRadiusKm(
            profile.commuteRadiusKm,
            homePlace?.countryCode,
            homePlace?.id === storedHomePlaceId
              ? profile.commuteRadiusDefaultKm
              : undefined,
          ),
          commuteUnit,
        ),
      );
  // An emptied field resets to the market default, shown as its placeholder.
  const commuteDefaultText = String(
    commuteRadiusToDisplay(
      effectiveCommuteRadiusKm(
        null,
        homePlace?.countryCode,
        homePlace?.id === storedHomePlaceId
          ? profile.commuteRadiusDefaultKm
          : undefined,
      ),
      commuteUnit,
    ),
  );
  const commuteRangeMessage = m.profileForm_commuteRadiusRangeError({
    min: `${commuteBounds.min} ${unitLabel(commuteUnit)}`,
    max: `${commuteBounds.max} ${unitLabel(commuteUnit)}`,
  });

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
    const commuteEdited = showsCommuteRadius && commuteDraft !== null;
    const commuteCleared = commuteEdited && commuteText.trim() === '';
    const commuteValue =
      commuteEdited && !commuteCleared
        ? parseCommuteRadius(commuteText, commuteUnit)
        : null;
    if (commuteEdited && !commuteCleared && commuteValue === null) {
      setCommuteError(true);
      commuteInput.current?.focus();
      return;
    }
    if (missing) return;
    setStatus('saving');
    const handle = form.handle;
    try {
      // A merge-patch: a built-in the layout hides is not sent, so the value
      // already stored on the profile is kept.
      const data: Parameters<typeof updateProfile>[0]['data'] = {
        profileVisibility: form.profileVisibility,
        openToRelocate: form.openToRelocate,
      };
      // With a home place the API sets the country from it, so the hidden
      // field sends nothing. Without one the candidate picks it: no locale
      // parsing can turn an ambiguous free-text location into an
      // eligibility decision.
      if (showsCountry) data.countryCode = form.countryCode;
      if (shows('name')) data.displayName = form.displayName.trim();
      data.handle = handle;
      if (shows('headline')) data.headline = form.headline.trim();
      if (shows('location')) {
        data.location = form.location.trim();
        // The picked place goes only when it changed; `null` drops a stored
        // place the candidate typed over or cleared.
        const homePlaceId = homePlace?.id ?? null;
        if (homePlaceId !== storedHomePlaceId) data.locationId = homePlaceId;
      }
      if (commuteCleared) {
        // `null` resets the distance to the market default.
        data.commuteRadiusKm = null;
      } else if (commuteValue !== null) {
        data.commuteRadiusKm = commuteRadiusFromDisplay(
          commuteValue,
          commuteUnit,
        );
      }
      if (shows('bio')) data.bio = form.bio.trim();
      if (shows('jobSearchStatus')) {
        data.jobSearchStatus = form.jobSearchStatus;
        data.jobSearchStatusVisibleTo = form.jobSearchStatusVisibleTo;
      }
      const result = await dependencies.updateProfile({ data });
      if (!result.ok) {
        setStatus('idle');
        if ('field' in result && result.field === 'location') {
          setLocationSaveError(boardErrorMessage({ code: result.code }));
          locationInput.current?.focus();
          return;
        }
        if ('field' in result && result.field === 'commuteRadius') {
          setCommuteError(true);
          commuteInput.current?.focus();
          return;
        }
        // Another candidate took the handle since the last probe.
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
    await reconcileCommittedAction(async () => {
      await Promise.all([router.invalidate(), refreshSession()]);
    }, dependencies.toastActionReconciliationError);
  }

  // Neither the country nor the profile visibility is a layout field: they
  // ride with the location and the job search status, and keep a place of
  // their own when those are hidden. The country shows only without a home
  // place, half width under the relocation switch.
  const countryField = showsCountry ? (
    <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
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
        <FieldDescription>
          {m.profileForm_countryDescription()}
        </FieldDescription>
      </Field>
    </div>
  ) : null;
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

  // The commute distance sits beside the location (stacked on phones), with
  // its description and error under the pair; the relocation switch follows.
  // Without a location field (the layout hides it) the commute field stands
  // alone. The country follows them, only when there is no home place.
  const homePlaceName = homePlace?.city || homePlace?.name || '';
  const commuteControl = showsCommuteRadius ? (
    <Field
      className="shrink-0 gap-1.5 sm:w-auto"
      data-invalid={commuteError || undefined}
    >
      <FieldLabel htmlFor="profile-commute-radius">
        {m.profileForm_commuteRadiusLabel()}
      </FieldLabel>
      <InputGroup>
        <InputGroupInput
          ref={commuteInput}
          id="profile-commute-radius"
          // Text, not number: the range is checked on submit with a
          // translated inline error, and a decimal distance is valid.
          type="text"
          inputMode="decimal"
          value={commuteText}
          placeholder={commuteDefaultText}
          aria-invalid={commuteError || undefined}
          aria-describedby={
            commuteError
              ? 'profile-commute-radius-description profile-commute-radius-error'
              : 'profile-commute-radius-description'
          }
          onChange={(event) => {
            setCommuteDraft({
              text: event.target.value,
              unit: commuteUnit,
            });
            setCommuteError(false);
            setStatus('idle');
          }}
        />
        <InputGroupAddon align="inline-end">
          {unitLabel(commuteUnit)}
        </InputGroupAddon>
      </InputGroup>
    </Field>
  ) : null;
  const commuteNotes = showsCommuteRadius ? (
    <>
      <FieldDescription id="profile-commute-radius-description">
        {m.profileForm_commuteRadiusDescription({ place: homePlaceName })}
      </FieldDescription>
      {commuteError ? (
        <FieldError id="profile-commute-radius-error">
          {commuteRangeMessage}
        </FieldError>
      ) : null}
    </>
  ) : null;
  const relocationField = (
    <Field orientation="horizontal" className="sm:col-span-2">
      <FieldContent>
        <FieldLabel htmlFor="profile-open-to-relocate">
          {m.profileForm_openToRelocatingLabel()}
        </FieldLabel>
        <FieldDescription id="profile-open-to-relocate-description">
          {m.profileForm_openToRelocateDescription()}
        </FieldDescription>
      </FieldContent>
      <Switch
        id="profile-open-to-relocate"
        aria-describedby="profile-open-to-relocate-description"
        checked={form.openToRelocate}
        onCheckedChange={(checked) => set('openToRelocate', checked)}
      />
    </Field>
  );
  const locationSettings = (
    <div className="flex flex-col gap-4 sm:col-span-2">
      {showsCommuteRadius ? (
        <div className="flex flex-col gap-1.5">
          {commuteControl}
          {commuteNotes}
        </div>
      ) : null}
      {relocationField}
    </div>
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
          <Field className="gap-1.5 sm:col-span-2">
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
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <Field
                  className="min-w-0 flex-1 gap-1.5"
                  data-invalid={
                    locationPickError || Boolean(locationSaveError) || undefined
                  }
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
                    invalid={locationPickError || Boolean(locationSaveError)}
                    describedBy={
                      locationPickError || locationSaveError
                        ? 'profile-location-error'
                        : undefined
                    }
                    onValueChange={(location) => {
                      set('location', location);
                      setLocationUnpicked(location.trim() !== '');
                      setLocationPickError(false);
                      setLocationSaveError(null);
                      setHomePlace(null);
                    }}
                    onPick={(place) => {
                      set('location', place.fullName ?? place.name);
                      setLocationUnpicked(false);
                      setLocationPickError(false);
                      setLocationSaveError(null);
                      setHomePlace(
                        place.id === storedHomePlaceId
                          ? toHomePlace(profile.locationPlace)
                          : {
                              id: place.id,
                              countryCode: place.countryCode,
                              placeType: place.placeType ?? null,
                              name: place.name,
                            },
                      );
                    }}
                    {...locationSuggestions}
                  />
                  {locationPickError ? (
                    <FieldError id="profile-location-error">
                      {m.locationField_pickRequiredError()}
                    </FieldError>
                  ) : locationSaveError ? (
                    <FieldError id="profile-location-error">
                      {locationSaveError}
                    </FieldError>
                  ) : null}
                </Field>
                {commuteControl}
              </div>
              {commuteNotes}
            </div>
            {relocationField}
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
        if (locationSuggestions.resolving) return;
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
          <>
            {locationSettings}
            {countryField}
          </>
        )}
        {shows('jobSearchStatus') ? null : (
          <div className="grid gap-4 sm:grid-cols-3">{visibilityField}</div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            disabled={status === 'saving' || locationSuggestions.resolving}
          >
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
