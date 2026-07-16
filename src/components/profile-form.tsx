'use client';

import { useState } from 'react';

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { CandidateProfile } from '@cavuno/board';

type FormState = {
  displayName: string;
  handle: string;
  headline: string;
  location: string;
  bio: string;
  profileVisibility: CandidateProfile['profileVisibility'];
  jobSearchStatus: CandidateProfile['jobSearchStatus'];
  jobSearchStatusVisibleTo: CandidateProfile['jobSearchStatusVisibleTo'];
  openToRelocate: boolean;
};

function toForm(profile: CandidateProfile): FormState {
  return {
    displayName: profile.displayName ?? '',
    handle: profile.handle ?? '',
    headline: profile.headline ?? '',
    location: profile.location ?? '',
    bio: profile.bio ?? '',
    profileVisibility: profile.profileVisibility,
    jobSearchStatus: profile.jobSearchStatus,
    jobSearchStatusVisibleTo: profile.jobSearchStatusVisibleTo,
    openToRelocate: profile.openToRelocate,
  };
}

type Status = 'idle' | 'saving' | 'saved' | 'error';
type HandleState = { checking: boolean; available: boolean | null };

/**
 * Profile edit form — recreates the hosted `/account` profile editor. One
 * merge-patch via `board.me.profile.update`; handle availability is probed
 * live on blur (`board.me.profile.handleAvailable`). The display-name field
 * is part of the same patch (the SDK hides the two-mutation split).
 */
export function ProfileForm({
  profile,
  locationSuggestions,
}: {
  profile: CandidateProfile;
  locationSuggestions: LocationSuggestionState;
}) {
  const visibilityLabels: Record<
    CandidateProfile['profileVisibility'],
    string
  > = {
    public: m.profileForm_visibilityPublic(),
    logged_in_only: m.profileForm_visibilityLoggedInOnly(),
    hidden: m.profileForm_visibilityHidden(),
  };
  const searchStatusLabels: Record<
    CandidateProfile['jobSearchStatus'],
    string
  > = {
    actively_looking: m.profileForm_searchStatusActivelyLooking(),
    open_to_offers: m.profileForm_searchStatusOpenToOffers(),
    not_looking: m.profileForm_searchStatusNotLooking(),
  };
  const visibleToLabels: Record<
    CandidateProfile['jobSearchStatusVisibleTo'],
    string
  > = {
    everyone: m.profileForm_visibleToEveryone(),
    employers_only: m.profileForm_visibleToEmployersOnly(),
  };

  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => toForm(profile));
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
          await updateProfile({
            data: {
              displayName: form.displayName.trim(),
              bio: form.bio.trim(),
              headline: form.headline.trim(),
              location: form.location.trim(),
              ...(handle ? { handle } : {}),
              profileVisibility: form.profileVisibility,
              jobSearchStatus: form.jobSearchStatus,
              jobSearchStatusVisibleTo: form.jobSearchStatusVisibleTo,
              openToRelocate: form.openToRelocate,
            },
          });
          await router.invalidate();
          setStatus('saved');
          setHandleState({ checking: false, available: null });
        } catch {
          setStatus('error');
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
                  const result = await checkHandle({ data: { handle } });
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
              onValueChange={(value) =>
                set(
                  'profileVisibility',
                  value as FormState['profileVisibility'],
                )
              }
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
              onValueChange={(value) =>
                set('jobSearchStatus', value as FormState['jobSearchStatus'])
              }
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
              onValueChange={(value) =>
                set(
                  'jobSearchStatusVisibleTo',
                  value as FormState['jobSearchStatusVisibleTo'],
                )
              }
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
          {status === 'saved' ? (
            <FieldDescription aria-live="polite">
              {m.profileForm_savedText()}
            </FieldDescription>
          ) : status === 'error' ? (
            <FieldError>{m.profileForm_saveError()}</FieldError>
          ) : null}
        </div>
      </FieldGroup>
    </form>
  );
}
