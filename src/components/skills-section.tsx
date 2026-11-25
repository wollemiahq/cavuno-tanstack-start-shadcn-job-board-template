'use client';

import {
  useEffect,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from 'react';

import { useRouter } from '@tanstack/react-router';
import { Sparkles, Target, type LucideIcon } from 'lucide-react';

import { m } from '../paraglide/messages';
import { replaceInterestedRoles, replaceSkills } from '../server/account';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
} from '@/components/ui/combobox';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from '@/components/ui/empty';
import { reconcileCommittedAction, toastActionError } from '@/lib/action-toast';
import { boardErrorMessage } from '@/lib/board-error-message';

type SaveResult = { ok: true } | { ok: false; code: string; message: string };

type TagListCopy = {
  emptyIcon: LucideIcon;
  heading: string;
  emptyText: string;
  placeholder: string;
  removeAriaLabel: (item: string) => string;
};

/**
 * Skills — chips over the whole-set replace
 * (`board.me.profile.updateSkills`). Typing and pressing Enter or a comma
 * adds; each add and remove persists immediately with one PUT.
 */
export function SkillsSection({ skills }: { skills: string[] }) {
  return (
    <TagListSection
      id="skills"
      items={skills}
      persist={(next) => replaceSkills({ data: { skills: next } })}
      copy={{
        emptyIcon: Sparkles,
        heading: m.skillsSection_heading(),
        emptyText: m.skillsSection_emptyText(),
        placeholder: m.skillsSection_inputPlaceholder(),
        removeAriaLabel: (skill) =>
          m.skillsSection_removeSkillAriaLabel({ skill }),
      }}
    />
  );
}

/**
 * Interested roles — the same chip field over the profile's `interestedRoles`
 * (`board.me.profile.update`, which replaces the list). Job matches rank on
 * skills and interested roles.
 */
export function InterestedRolesSection({ roles }: { roles: string[] }) {
  return (
    <TagListSection
      id="interested-roles"
      items={roles}
      persist={(next) => replaceInterestedRoles({ data: { roles: next } })}
      copy={{
        emptyIcon: Target,
        heading: m.interestedRolesSection_heading(),
        emptyText: m.interestedRolesSection_emptyText(),
        placeholder: m.interestedRolesSection_inputPlaceholder(),
        removeAriaLabel: (role) =>
          m.interestedRolesSection_removeRoleAriaLabel({ role }),
      }}
    />
  );
}

/**
 * The entries in `text` (split on commas and new lines, trimmed) that are not
 * blank and not already in `items` or earlier in `text`, ignoring case.
 */
export function newTagEntries(items: string[], text: string): string[] {
  const seen = new Set(items.map((item) => item.toLowerCase()));
  const added: string[] = [];
  for (const part of text.split(/[,\n]/)) {
    const entry = part.trim();
    const key = entry.toLowerCase();
    if (!entry || seen.has(key)) continue;
    seen.add(key);
    added.push(entry);
  }
  return added;
}

function TagListSection({
  id,
  items: initialValues,
  persist,
  copy,
}: {
  id: string;
  items: string[];
  persist: (next: string[]) => Promise<SaveResult>;
  copy: TagListCopy;
}) {
  const router = useRouter();
  const [items, setValues] = useState(initialValues);
  useEffect(() => setValues(initialValues), [initialValues]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);

  const save = async (next: string[]): Promise<boolean> => {
    if (pending) return false;
    setPending(true);
    try {
      const result = await persist(next);
      if (!result.ok) {
        void toastActionError(boardErrorMessage(result));
        return false;
      }
      setValues(next);
      await reconcileCommittedAction(() => router.invalidate());
      return true;
    } catch {
      void toastActionError();
      return false;
    } finally {
      setPending(false);
    }
  };

  /** Adds every new entry in `text`; the input clears once they are saved. */
  const add = async (text: string) => {
    if (pending) return;
    const added = newTagEntries(items, text);
    if (added.length === 0) {
      setInput('');
      return;
    }
    setInput(text);
    if (await save([...items, ...added])) setInput('');
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter' && event.key !== ',') return;
    event.preventDefault();
    void add(input);
  };

  const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData('text');
    if (!/[,\n]/.test(pasted)) return;
    event.preventDefault();
    void add(input + pasted);
  };

  return (
    <Card data-test={`${id}-section`} id={id}>
      <CardHeader>
        <CardTitle>
          <h2>{copy.heading}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <Empty className="border-0 p-4">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <copy.emptyIcon aria-hidden="true" />
              </EmptyMedia>
              <EmptyDescription>{copy.emptyText}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : null}
        <Combobox
          multiple
          items={[]}
          value={items}
          onValueChange={(next) => void save(next)}
          inputValue={input}
          onInputValueChange={setInput}
          readOnly={pending}
        >
          <ComboboxChips>
            {items.map((item) => (
              <ComboboxChip
                key={item}
                removeAriaLabel={copy.removeAriaLabel(item)}
              >
                {item}
              </ComboboxChip>
            ))}
            <ComboboxChipsInput
              id={`${id}-input`}
              aria-label={copy.heading}
              // Only while empty: after chips it would be clipped on a phone.
              placeholder={items.length === 0 ? copy.placeholder : undefined}
              onKeyDown={onKeyDown}
              onPaste={onPaste}
            />
          </ComboboxChips>
        </Combobox>
      </CardContent>
    </Card>
  );
}
