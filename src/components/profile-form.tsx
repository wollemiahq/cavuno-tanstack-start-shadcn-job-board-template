'use client';

import { useState } from 'react';

import { countryOptions } from '@cavuno/board/format';
import { useRouter } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { checkHandle, updateProfile } from '../server/account';

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
import { toastActionError, toastActionSuccess } from '@/lib/action-toast';
import { searchString } from '@/lib/pagination';
import type { CandidateProfile } from '@cavuno/board';

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
    handle: profile.handle ?? '',
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
type HandleState = { checking: boolean; available: boolean | null };
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
  toastActionSuccess: () => void | Promise<void>;
}

const profileFormDependencies: ProfileFormDependencies = {
  checkHandle,
  updateProfile,
  toastActionError,
  toastActionSuccess,
};

/**
 * Profile edit form — recreates the hosted `/account` profile editor. One
 * merge-patch via `board.me.profile.update`; handle availability is probed
 * live on blur (`board.me.profile.handleAvailable`). The display-name field
 * is part of the same patch (the SDK hides the two-mutation split).
 */
export function ProfileForm({
  profile,
  locationSuggestions,
  language,
  dependencies = profileFormDependencies,
}: {
  profile: CandidateProfile;
  locationSuggestions: LocationSuggestionState;
  language: string;
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
  const [handleState, setHandleState] = useState<HandleState>({
    checking: false,
    available: null,
  });

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setStatus('idle');
  };

  const handleChanged = form.handle.trim() !== (profile.handle ?? '');

  return (
    <form
      data-test="profile-form"
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setStatus('saving');
        const handle = form.handle.trim();
        try {
          const data = handle
            ? {
                displayName: form.displayName.trim(),
                bio: form.bio.trim(),
                headline: form.headline.trim(),
                location: form.location.trim(),
                // This is deliberately independent of the free-text location:
                // no locale parsing or backfill can turn an ambiguous historic
                // location into an eligibility decision.
                countryCode: form.countryCode,
                handle,
                profileVisibility: form.profileVisibility,
                jobSearchStatus: form.jobSearchStatus,
                jobSearchStatusVisibleTo: form.jobSearchStatusVisibleTo,
                openToRelocate: form.openToRelocate,
              }
            : {
                displayName: form.displayName.trim(),
                bio: form.bio.trim(),
                headline: form.headline.trim(),
                location: form.location.trim(),
                // This is deliberately independent of the free-text location:
                // no locale parsing or backfill can turn an ambiguous historic
                // location into an eligibility decision.
                countryCode: form.countryCode,
                profileVisibility: form.profileVisibility,
                jobSearchStatus: form.jobSearchStatus,
                jobSearchStatusVisibleTo: form.jobSearchStatusVisibleTo,
                openToRelocate: form.openToRelocate,
              };
          await dependencies.updateProfile({ data });
          await router.invalidate();
          setStatus('idle');
          setHandleState({ checking: false, available: null });
          void dependencies.toastActionSuccess();
        } catch {
          setStatus('idle');
          void dependencies.toastActionError();
        }
      }}
    >
      <FieldGroup className="gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field className="gap-1.5">
            <FieldLabel htmlFor="profile-display-name">
              {m.profileForm_displayNameLabel()}
            </FieldLabel>
            <Input
              id="profile-display-name"
              value={form.displayName}
              onChange={(event) => set('displayName', event.target.value)}
            />
          </Field>
          <Field
            className="gap-1.5"
            data-invalid={handleState.available === false || undefined}
          >
            <FieldLabel htmlFor="profile-handle">
              {m.profileForm_handleLabel()}
            </FieldLabel>
            <Input
              id="profile-handle"
              value={form.handle}
              aria-invalid={handleState.available === false || undefined}
              onChange={(event) => {
                set('handle', event.target.value);
                setHandleState({ checking: false, available: null });
              }}
              onBlur={async () => {
                const handle = form.handle.trim();
                if (!handle || !handleChanged) return;
                setHandleState({ checking: true, available: null });
                try {
                  const result = await dependencies.checkHandle({
                    data: { handle },
                  });
                  setHandleState({
                    checking: false,
                    available: result.available,
                  });
                } catch {
                  setHandleState({ checking: false, available: null });
                }
              }}
            />
            {handleState.checking ? (
              <FieldDescription>
                {m.profileForm_handleCheckingText()}
              </FieldDescription>
            ) : handleState.available === false ? (
              <FieldError>{m.profileForm_handleTakenText()}</FieldError>
            ) : handleState.available === true ? (
              <FieldDescription>
                {m.profileForm_handleAvailableText()}
              </FieldDescription>
            ) : null}
          </Field>
          <Field className="gap-1.5">
            <FieldLabel htmlFor="profile-headline">
              {m.profileForm_headlineLabel()}
            </FieldLabel>
            <Input
              id="profile-headline"
              value={form.headline}
              placeholder={m.profileForm_headlinePlaceholder()}
              onChange={(event) => set('headline', event.target.value)}
            />
          </Field>
          <Field className="gap-1.5">
            <FieldLabel htmlFor="profile-location">
              {m.profileForm_locationLabel()}
            </FieldLabel>
            <LocationSuggestField
              id="profile-location"
              value={form.location}
              placeholder={m.profileForm_locationPlaceholder()}
              searchingText={m.locationCombobox_searchingText()}
              onValueChange={(location) => set('location', location)}
              {...locationSuggestions}
            />
          </Field>
          <Field className="gap-1.5">
            <FieldLabel htmlFor="profile-country">
              {m.profileForm_countryLabel()}
            </FieldLabel>
            <NativeSelect
              id="profile-country"
              className="w-full"
              value={form.countryCode ?? ''}
              onChange={(event) =>
                set('countryCode', event.target.value || null)
              }
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

        <Field className="gap-1.5">
          <FieldLabel htmlFor="profile-bio">
            {m.profileForm_bioLabel()}
          </FieldLabel>
          <Textarea
            id="profile-bio"
            value={form.bio}
            rows={4}
            onChange={(event) => set('bio', event.target.value)}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
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

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={status === 'saving'}>
            {status === 'saving'
              ? m.profileForm_savingLabel()
              : m.profileForm_saveLabel()}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
