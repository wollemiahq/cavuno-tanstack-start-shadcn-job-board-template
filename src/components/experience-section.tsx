'use client'

import { useState } from 'react'

import { useRouter } from '@tanstack/react-router'
import type { CandidateExperience } from '@cavuno/board'

import { Button } from '@/components/base/buttons/button'
import { Input } from '@/components/base/input/input'
import { TextArea } from '@/components/base/textarea/textarea'
import { Text } from '@/components/text'
import { m } from '../paraglide/messages'
import {
  createExperience,
  deleteExperience,
  updateExperience,
} from '../server/account'

type Editing = { id: string | null } | null

type Draft = {
  title: string
  companyName: string
  location: string
  startDate: string
  endDate: string
  description: string
}

const EMPTY: Draft = {
  title: '',
  companyName: '',
  location: '',
  startDate: '',
  endDate: '',
  description: '',
}

function toDraft(item: CandidateExperience): Draft {
  return {
    title: item.title,
    companyName: item.companyName,
    location: item.location ?? '',
    startDate: item.startDate,
    endDate: item.endDate ?? '',
    description: item.description ?? '',
  }
}

/**
 * Work experience — list + add/edit/delete, over `board.me.profile`'s
 * `listExperience` / `createExperience` / `updateExperience` /
 * `deleteExperience`. The body is a merge-patch on edit (empty clears).
 */
export function ExperienceSection({ items }: { items: CandidateExperience[] }) {
  const router = useRouter()
  const [editing, setEditing] = useState<Editing>(null)
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [pending, setPending] = useState(false)

  const open = (item: CandidateExperience | null) => {
    setEditing({ id: item ? item.id : null })
    setDraft(item ? toDraft(item) : EMPTY)
  }

  const submit = async () => {
    setPending(true)
    const body = {
      title: draft.title.trim(),
      companyName: draft.companyName.trim(),
      location: draft.location.trim(),
      startDate: draft.startDate,
      endDate: draft.endDate,
      description: draft.description.trim(),
    }
    try {
      if (editing?.id) {
        await updateExperience({ data: { id: editing.id, body } })
      } else {
        await createExperience({ data: body })
      }
      await router.invalidate()
      setEditing(null)
      setDraft(EMPTY)
    } finally {
      setPending(false)
    }
  }

  return (
    <section className="space-y-3" data-test="experience-section">
      <div className="flex items-center justify-between">
        <Text as="h2" variant="heading4">{m.experienceSection_heading()}</Text>
        {editing === null ? (
          <Button color="secondary" size="sm" onClick={() => open(null)}>
            {m.experienceSection_addLabel()}
          </Button>
        ) : null}
      </div>

      {items.length === 0 && editing === null ? (
        <p className="text-tertiary text-sm">{m.experienceSection_emptyText()}</p>
      ) : null}

      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="border-secondary flex items-start justify-between gap-3 rounded-lg border p-3"
          >
            <div>
              <p className="font-medium">{item.title}</p>
              <p className="text-tertiary text-sm">
                {item.companyName}
                {item.location ? ` · ${item.location}` : ''}
              </p>
              <p className="text-tertiary text-xs">
                {item.startDate}
                {item.endDate ? ` – ${item.endDate}` : ` – ${m.experienceSection_presentLabel()}`}
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button color="tertiary" size="sm" onClick={() => open(item)}>
                {m.experienceSection_editLabel()}
              </Button>
              <Button
                color="tertiary"
                size="sm"
                onClick={async () => {
                  await deleteExperience({ data: { id: item.id } })
                  await router.invalidate()
                }}
              >
                {m.experienceSection_deleteLabel()}
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
              label={m.experienceSection_titleLabel()}
              isRequired
              value={draft.title}
              onChange={(value) => setDraft({ ...draft, title: value })}
            />
            <Input
              label={m.experienceSection_companyLabel()}
              isRequired
              value={draft.companyName}
              onChange={(value) => setDraft({ ...draft, companyName: value })}
            />
            <Input
              label={m.experienceSection_locationLabel()}
              value={draft.location}
              onChange={(value) => setDraft({ ...draft, location: value })}
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                label={m.experienceSection_startLabel()}
                type="date"
                isRequired
                value={draft.startDate}
                onChange={(value) => setDraft({ ...draft, startDate: value })}
              />
              <Input
                label={m.experienceSection_endLabel()}
                type="date"
                value={draft.endDate}
                onChange={(value) => setDraft({ ...draft, endDate: value })}
              />
            </div>
          </div>
          <TextArea
            label={m.experienceSection_descriptionLabel()}
            rows={3}
            value={draft.description}
            onChange={(value) => setDraft({ ...draft, description: value })}
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm" isDisabled={pending}>
              {pending ? m.experienceSection_savingLabel() : m.experienceSection_saveLabel()}
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
              {m.experienceSection_cancelLabel()}
            </Button>
          </div>
        </form>
      ) : null}
    </section>
  )
}
