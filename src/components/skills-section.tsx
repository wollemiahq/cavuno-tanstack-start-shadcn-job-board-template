'use client'

import { useState } from 'react'

import { useRouter } from '@tanstack/react-router'
import { X } from '@untitledui/icons'

import { Button } from '@/components/base/buttons/button'
import { InputBase } from '@/components/base/input/input'
import { Text } from '@/components/text'
import { m } from '../paraglide/messages'
import { replaceSkills } from '../server/account'

/**
 * Skills — a tag editor over the whole-set replace
 * (`board.me.profile.updateSkills`). Edits are local; one PUT on save.
 */
export function SkillsSection({ skills: initial }: { skills: string[] }) {
  const router = useRouter()
  const [skills, setSkills] = useState<string[]>(initial)
  const [input, setInput] = useState('')
  const [pending, setPending] = useState(false)

  const dirty =
    skills.length !== initial.length ||
    skills.some((s, i) => s !== initial[i])

  const add = () => {
    const name = input.trim()
    if (!name || skills.includes(name)) {
      setInput('')
      return
    }
    setSkills([...skills, name])
    setInput('')
  }

  return (
    <section className="space-y-3" data-test="skills-section">
      <Text as="h2" variant="heading4">{m.skillsSection_heading()}</Text>
      {skills.length === 0 ? (
        <p className="text-tertiary text-sm">{m.skillsSection_emptyText()}</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {skills.map((skill) => (
            <li
              key={skill}
              className="bg-secondary flex items-center gap-1 rounded-full px-3 py-1 text-sm"
            >
              {skill}
              <button
                type="button"
                aria-label={m.skillsSection_removeSkillAriaLabel({ skill })}
                className="text-tertiary hover:text-primary"
                onClick={() => setSkills(skills.filter((s) => s !== skill))}
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <InputBase
          wrapperClassName="flex-1"
          value={input}
          placeholder={m.skillsSection_addSkillLabel()}
          aria-label={m.skillsSection_addSkillLabel()}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
        />
        <Button type="button" color="secondary" onClick={add}>
          {m.skillsSection_addLabel()}
        </Button>
      </div>
      {dirty ? (
        <Button
          size="sm"
          isDisabled={pending}
          onClick={async () => {
            setPending(true)
            try {
              await replaceSkills({ data: { skills } })
              await router.invalidate()
            } finally {
              setPending(false)
            }
          }}
        >
          {pending ? m.skillsSection_savingLabel() : m.skillsSection_saveLabel()}
        </Button>
      ) : null}
    </section>
  )
}
