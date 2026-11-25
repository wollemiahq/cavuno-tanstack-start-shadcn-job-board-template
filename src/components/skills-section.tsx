'use client';

import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from 'react';

import { useRouter } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { replaceInterestedRoles, replaceSkills } from '../server/account';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
} from '@/components/ui/combobox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FieldError } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { reconcileCommittedAction } from '@/lib/action-toast';
import { boardErrorMessage } from '@/lib/board-error-message';

type SaveResult = { ok: true } | { ok: false; code: string; message: string };

type TagListCopy = {
  heading: string;
  description: string;
  addLabel: string;
  placeholder: string;
  removeAriaLabel: (item: string) => string;
};

/**
 * Skills — read-only chips, edited in a dialog and saved as a whole-set
 * replace (`board.me.profile.updateSkills`).
 */
export function SkillsSection({ skills }: { skills: string[] }) {
  return (
    <TagListSection
      id="skills"
      items={skills}
      persist={(next) => replaceSkills({ data: { skills: next } })}
      copy={{
        heading: m.skillsSection_heading(),
        description: m.skillsSection_description(),
        addLabel: m.skillsSection_addLabel(),
        placeholder: m.skillsSection_inputPlaceholder(),
        removeAriaLabel: (skill) =>
          m.skillsSection_removeSkillAriaLabel({ skill }),
      }}
    />
  );
}

/**
 * Interested roles — the same card and dialog over the profile's `interestedRoles`
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
        heading: m.interestedRolesSection_heading(),
        description: m.interestedRolesSection_description(),
        addLabel: m.interestedRolesSection_addLabel(),
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
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const startEditing = () => {
    setDraft(items);
    setInput('');
    setError(null);
    setOpen(true);
  };

  /** Adds every new entry in `text` to the draft and clears the input. */
  const addToDraft = (text: string) => {
    setDraft((current) => [...current, ...newTagEntries(current, text)]);
    setInput('');
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter' && event.key !== ',') return;
    event.preventDefault();
    addToDraft(input);
  };

  const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData('text');
    if (!/[,\n]/.test(pasted)) return;
    event.preventDefault();
    addToDraft(input + pasted);
  };

  const save = async () => {
    if (pending) return;
    // Text typed but not yet entered is saved too.
    const next = [...draft, ...newTagEntries(draft, input)];
    setDraft(next);
    setInput('');
    setError(null);
    setPending(true);
    try {
      const result = await persist(next);
      if (!result.ok) {
        setError(boardErrorMessage(result));
        return;
      }
      setValues(next);
      setOpen(false);
      await reconcileCommittedAction(() => router.invalidate());
    } catch {
      setError(m.candidateAction_errorText());
    } finally {
      setPending(false);
    }
  };

  return (
    <Card data-test={`${id}-section`} id={id}>
      <CardHeader>
        <CardTitle>
          <h2>{copy.heading}</h2>
        </CardTitle>
        <CardDescription>{copy.description}</CardDescription>
        <CardAction>
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={startEditing}
          >
            {items.length > 0 ? m.skillsSection_editLabel() : copy.addLabel}
          </Button>
        </CardAction>
      </CardHeader>
      {items.length > 0 ? (
        <CardContent>
          <ul className="flex flex-wrap gap-2">
            {items.map((item) => (
              <Badge key={item} variant="secondary" render={<li />}>
                {item}
              </Badge>
            ))}
          </ul>
        </CardContent>
      ) : null}

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next && !pending) setOpen(false);
        }}
      >
        <DialogContent initialFocus={inputRef}>
          <DialogHeader>
            <DialogTitle>{copy.heading}</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-6"
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
          >
            <div className="grid gap-2">
              <Combobox
                multiple
                items={[]}
                value={draft}
                onValueChange={setDraft}
                inputValue={input}
                onInputValueChange={setInput}
                readOnly={pending}
              >
                <ComboboxChips>
                  {draft.map((item) => (
                    <ComboboxChip
                      key={item}
                      removeAriaLabel={copy.removeAriaLabel(item)}
                    >
                      {item}
                    </ComboboxChip>
                  ))}
                  <ComboboxChipsInput
                    ref={inputRef}
                    id={`${id}-input`}
                    aria-label={copy.heading}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? `${id}-error` : undefined}
                    placeholder={copy.placeholder}
                    onKeyDown={onKeyDown}
                    onPaste={onPaste}
                  />
                </ComboboxChips>
              </Combobox>
              {error ? (
                <FieldError id={`${id}-error`}>{error}</FieldError>
              ) : null}
            </div>
            {/* Overlay editors right-align their footer, Cancel before the
                primary — the Dialog/Sheet/AlertDialog convention. */}
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={() => setOpen(false)}
              >
                {m.skillsSection_cancelLabel()}
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? <Spinner /> : null}
                {pending
                  ? m.skillsSection_savingLabel()
                  : m.skillsSection_saveLabel()}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
