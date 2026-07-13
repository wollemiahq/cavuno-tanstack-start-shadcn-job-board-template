'use client'

import { useState } from 'react'

import { useRouter } from '@tanstack/react-router'
import type { CandidateProfile } from '@cavuno/board'

import { Button } from '@/components/base/buttons/button'
import { Checkbox } from '@/components/base/checkbox/checkbox'
import { Input } from '@/components/base/input/input'
import { Select } from '@/components/base/select/select'
import { TextArea } from '@/components/base/textarea/textarea'
import { m } from '../paraglide/messages'
import { checkHandle, updateProfile } from '../server/account'

type FormState = {
  displayName: string
  handle: string
  headline: string
  location: string
  bio: string
  profileVisibility: CandidateProfile['profileVisibility']
  jobSearchStatus: CandidateProfile['jobSearchStatus']
  jobSearchStatusVisibleTo: CandidateProfile['jobSearchStatusVisibleTo']
  openToRelocate: boolean
}

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
  }
}

type Status = 'idle' | 'saving' | 'saved' | 'error'
type HandleState = { checking: boolean; available: boolean | null }

/**
 * Profile edit form — recreates the hosted `/account` profile editor. One
 * merge-patch via `board.me.profile.update`; handle availability is probed
 * live on blur (`board.me.profile.handleAvailable`). The display-name field
 * is part of the same patch (the SDK hides the two-mutation split).
 */
export function ProfileForm({ profile }: { profile: CandidateProfile }) {
  const visibilityLabels: Record<CandidateProfile['profileVisibility'], string> = {
    public: m.profileForm_visibilityPublic(),
    logged_in_only: m.profileForm_visibilityLoggedInOnly(),
    hidden: m.profileForm_visibilityHidden(),
  }
  const searchStatusLabels: Record<CandidateProfile['jobSearchStatus'], string> = {
    actively_looking: m.profileForm_searchStatusActivelyLooking(),
    open_to_offers: m.profileForm_searchStatusOpenToOffers(),
    not_looking: m.profileForm_searchStatusNotLooking(),
  }
  const visibleToLabels: Record<
    CandidateProfile['jobSearchStatusVisibleTo'],
    string
  > = {
    everyone: m.profileForm_visibleToEveryone(),
    employers_only: m.profileForm_visibleToEmployersOnly(),
  }

  const router = useRouter()
  const [form, setForm] = useState<FormState>(() => toForm(profile))
  const [status, setStatus] = useState<Status>('idle')
  const [handleState, setHandleState] = useState<HandleState>({
    checking: false,
    available: null,
  })

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setStatus('idle')
  }

  const handleChanged = form.handle.trim() !== (profile.handle ?? '')

  return (
    <form
      data-test="profile-form"
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault()
        setStatus('saving')
        const handle = form.handle.trim()
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
          })
          await router.invalidate()
          setStatus('saved')
          setHandleState({ checking: false, available: null })
        } catch {
          setStatus('error')
        }
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label={m.profileForm_displayNameLabel()}
          value={form.displayName}
          onChange={(value) => set('displayName', value)}
        />
        <div className="space-y-1.5">
          <Input
            label={m.profileForm_handleLabel()}
            value={form.handle}
            isInvalid={handleState.available === false}
            onChange={(value) => {
              set('handle', value)
              setHandleState({ checking: false, available: null })
            }}
            onBlur={async () => {
              const handle = form.handle.trim()
              if (!handle || !handleChanged) return
              setHandleState({ checking: true, available: null })
              try {
                const result = await checkHandle({ data: { handle } })
                setHandleState({ checking: false, available: result.available })
              } catch {
                setHandleState({ checking: false, available: null })
              }
            }}
          />
          {handleState.checking ? (
            <p className="text-tertiary text-xs">{m.profileForm_handleCheckingText()}</p>
          ) : handleState.available === false ? (
            <p className="text-error-primary text-xs">{m.profileForm_handleTakenText()}</p>
          ) : handleState.available === true ? (
            <p className="text-xs text-green-600">{m.profileForm_handleAvailableText()}</p>
          ) : null}
        </div>
        <Input
          label={m.profileForm_headlineLabel()}
          value={form.headline}
          placeholder={m.profileForm_headlinePlaceholder()}
          onChange={(value) => set('headline', value)}
        />
        <Input
          label={m.profileForm_locationLabel()}
          value={form.location}
          placeholder={m.profileForm_locationPlaceholder()}
          onChange={(value) => set('location', value)}
        />
      </div>

      <TextArea
        label={m.profileForm_bioLabel()}
        value={form.bio}
        rows={4}
        onChange={(value) => set('bio', value)}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Select
          label={m.profileForm_visibilityLabel()}
          selectedKey={form.profileVisibility}
          onSelectionChange={(key) =>
            set('profileVisibility', key as FormState['profileVisibility'])
          }
          items={Object.entries(visibilityLabels).map(([id, label]) => ({
            id,
            label,
          }))}
        >
          {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
        </Select>
        <Select
          label={m.profileForm_searchStatusLabel()}
          selectedKey={form.jobSearchStatus}
          onSelectionChange={(key) =>
            set('jobSearchStatus', key as FormState['jobSearchStatus'])
          }
          items={Object.entries(searchStatusLabels).map(([id, label]) => ({
            id,
            label,
          }))}
        >
          {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
        </Select>
        <Select
          label={m.profileForm_visibleToLabel()}
          selectedKey={form.jobSearchStatusVisibleTo}
          onSelectionChange={(key) =>
            set(
              'jobSearchStatusVisibleTo',
              key as FormState['jobSearchStatusVisibleTo'],
            )
          }
          items={Object.entries(visibleToLabels).map(([id, label]) => ({
            id,
            label,
          }))}
        >
          {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
        </Select>
      </div>

      <Checkbox
        label={m.profileForm_openToRelocatingLabel()}
        isSelected={form.openToRelocate}
        onChange={(isSelected) => set('openToRelocate', isSelected)}
      />

      <div className="flex items-center gap-3">
        <Button type="submit" isDisabled={status === 'saving'}>
          {status === 'saving' ? m.profileForm_savingLabel() : m.profileForm_saveLabel()}
        </Button>
        {status === 'saved' ? (
          <p className="text-tertiary text-sm" role="status">
            {m.profileForm_savedText()}
          </p>
        ) : status === 'error' ? (
          <p className="text-error-primary text-sm" role="status">
            {m.profileForm_saveError()}
          </p>
        ) : null}
      </div>
    </form>
  )
}
