'use client'

import { useState } from 'react'

import { useRouter } from '@tanstack/react-router'
import type { CandidateEducation } from '@cavuno/board'

import { Button } from '@/components/base/buttons/button'
import { Input } from '@/components/base/input/input'
import { TextArea } from '@/components/base/textarea/textarea'
import { Text } from '@/components/text'
import { m } from '../paraglide/messages'
import {
  createEducation,
  deleteEducation,
  updateEducation,
} from '../server/account'

type Editing = { id: string | null } | null

type Draft = {
  institutionName: string
  degree: string
  fieldOfStudy: string
  startDate: string
  endDate: string
  description: string
}

const EMPTY: Draft = {
  institutionName: '',
  degree: '',
  fieldOfStudy: '',
  startDate: '',
  endDate: '',
  description: '',
}

function toDraft(item: CandidateEducation): Draft {
  return {
    institutionName: item.institutionName,
    degree: item.degree ?? '',
    fieldOfStudy: item.fieldOfStudy ?? '',
    startDate: item.startDate ?? '',
    endDate: item.endDate ?? '',
    description: item.description ?? '',
  }
}

/**
 * Education — list + add/edit/delete, over `board.me.profile`'s
 * `listEducation` / `createEducation` / `updateEducation` /
 * `deleteEducation`.
 */
export function EducationSection({ items }: { items: CandidateEducation[] }) {
  const router = useRouter()
  const [editing, setEditing] = useState<Editing>(null)
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [pending, setPending] = useState(false)

  const open = (item: CandidateEducation | null) => {
    setEditing({ id: item ? item.id : null })
    setDraft(item ? toDraft(item) : EMPTY)
  }

  const submit = async () => {
    setPending(true)
    const body = {
      institutionName: draft.institutionName.trim(),
      degree: draft.degree.trim(),
      fieldOfStudy: draft.fieldOfStudy.trim(),
      startDate: draft.startDate,
      endDate: draft.endDate,
      description: draft.description.trim(),
    }
    try {
      if (editing?.id) {
        await updateEducation({ data: { id: editing.id, body } })
      } else {
        await createEducation({ data: body })
      }
      await router.invalidate()
      setEditing(null)
      setDraft(EMPTY)
    } finally {
      setPending(false)
    }
  }

  return (
    <section className="space-y-3" data-test="education-section">
      <div className="flex items-center justify-between">
        <Text as="h2" variant="heading4">{m.educationSection_heading()}</Text>
        {editing === null ? (
          <Button color="secondary" size="sm" onClick={() => open(null)}>
            {m.educationSection_addLabel()}
          </Button>
        ) : null}
      </div>

      {items.length === 0 && editing === null ? (
        <p className="text-tertiary text-sm">{m.educationSection_emptyText()}</p>
      ) : null}

      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="border-secondary flex items-start justify-between gap-3 rounded-lg border p-3"
          >
            <div>
              <p className="font-medium">{item.institutionName}</p>
              <p className="text-tertiary text-sm">
                {[item.degree, item.fieldOfStudy].filter(Boolean).join(', ')}
              </p>
              {item.startDate || item.endDate ? (
                <p className="text-tertiary text-xs">
                  {item.startDate ?? '?'} – {item.endDate ?? m.educationSection_presentLabel()}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 gap-1">
              <Button color="tertiary" size="sm" onClick={() => open(item)}>
                {m.educationSection_editLabel()}
              </Button>
              <Button
                color="tertiary"
                size="sm"
                onClick={async () => {
                  await deleteEducation({ data: { id: item.id } })
                  await router.invalidate()
                }}
              >
                {m.educationSection_deleteLabel()}
              </Button>
            </div>
          </li>
        ))}
      </ul>

      {editing !== null ? (
        <form
          className="border-secondary space-y-3 rounded-lg border p-3"
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label={m.educationSection_institutionLabel()}
              isRequired
              value={draft.institutionName}
              onChange={(value) =>
                setDraft({ ...draft, institutionName: value })
              }
            />
            <Input
              label={m.educationSection_degreeLabel()}
              value={draft.degree}
              onChange={(value) => setDraft({ ...draft, degree: value })}
            />
            <Input
              label={m.educationSection_fieldOfStudyLabel()}
              value={draft.fieldOfStudy}
              onChange={(value) => setDraft({ ...draft, fieldOfStudy: value })}
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                label={m.educationSection_startLabel()}
                type="date"
                value={draft.startDate}
                onChange={(value) => setDraft({ ...draft, startDate: value })}
              />
              <Input
                label={m.educationSection_endLabel()}
                type="date"
                value={draft.endDate}
                onChange={(value) => setDraft({ ...draft, endDate: value })}
              />
            </div>
          </div>
          <TextArea
            label={m.educationSection_descriptionLabel()}
            rows={3}
            value={draft.description}
            onChange={(value) => setDraft({ ...draft, description: value })}
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm" isDisabled={pending}>
              {pending ? m.educationSection_savingLabel() : m.educationSection_saveLabel()}
            </Button>
            <Button
              type="button"
              color="tertiary"
              size="sm"
              isDisabled={pending}
              onClick={() => {
                setEditing(null)
                setDraft(EMPTY)
              }}
            >
              {m.educationSection_cancelLabel()}
            </Button>
          </div>
        </form>
      ) : null}
    </section>
  )
}
