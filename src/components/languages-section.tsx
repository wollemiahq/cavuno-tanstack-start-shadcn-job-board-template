'use client'

import { useState } from 'react'

import { useRouter } from '@tanstack/react-router'
import { X } from '@untitledui/icons'

import { Button } from '@/components/base/buttons/button'
import { InputBase } from '@/components/base/input/input'
import { Text } from '@/components/text'
import { m } from '../paraglide/messages'
import { replaceLanguages } from '../server/account'

type Language = { name: string; proficiency: string }

const LEVELS = ['Native', 'Fluent', 'Professional', 'Conversational', 'Basic']

/**
 * Languages — name + proficiency rows over the whole-set replace
 * (`board.me.profile.updateLanguages`). Proficiency is a free string
 * (the API takes any value); the datalist just suggests common levels.
 */
export function LanguagesSection({
  languages: initial,
}: {
  languages: Language[]
}) {
  const router = useRouter()
  const [languages, setLanguages] = useState<Language[]>(initial)
  const [pending, setPending] = useState(false)

  const dirty = JSON.stringify(languages) !== JSON.stringify(initial)
  const valid = languages.every((l) => l.name.trim() && l.proficiency.trim())

  const update = (index: number, patch: Partial<Language>) =>
    setLanguages(languages.map((l, i) => (i === index ? { ...l, ...patch } : l)))

  return (
    <section className="space-y-3" data-test="languages-section">
      <Text as="h2" variant="heading4">{m.languagesSection_heading()}</Text>
      <datalist id="proficiency-levels">
        {LEVELS.map((level) => (
          <option key={level} value={level} />
        ))}
      </datalist>
      {languages.length === 0 ? (
        <p className="text-tertiary text-sm">{m.languagesSection_emptyText()}</p>
      ) : (
        <ul className="space-y-2">
          {languages.map((language, index) => (
            <li key={index} className="flex items-center gap-2">
              <InputBase
                wrapperClassName="flex-1"
                value={language.name}
                placeholder={m.languagesSection_languageLabel()}
                aria-label={m.languagesSection_languageLabel()}
                onChange={(e) => update(index, { name: e.target.value })}
              />
              <InputBase
                wrapperClassName="flex-1"
                value={language.proficiency}
                placeholder={m.languagesSection_proficiencyLabel()}
                aria-label={m.languagesSection_proficiencyLabel()}
                list="proficiency-levels"
                onChange={(e) => update(index, { proficiency: e.target.value })}
              />
              <button
                type="button"
                aria-label={m.languagesSection_removeLanguageAriaLabel()}
                className="text-tertiary hover:text-primary shrink-0"
                onClick={() =>
                  setLanguages(languages.filter((_, i) => i !== index))
                }
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Button
          type="button"
          color="secondary"
          size="sm"
          onClick={() =>
            setLanguages([...languages, { name: '', proficiency: '' }])
          }
        >
          {m.languagesSection_addLabel()}
        </Button>
        {dirty ? (
          <Button
            size="sm"
            isDisabled={pending || !valid}
            onClick={async () => {
              setPending(true)
              try {
                await replaceLanguages({ data: { languages } })
                await router.invalidate()
              } finally {
                setPending(false)
              }
            }}
          >
            {pending ? m.languagesSection_savingLabel() : m.languagesSection_saveLabel()}
          </Button>
        ) : null}
      </div>
    </section>
  )
}
