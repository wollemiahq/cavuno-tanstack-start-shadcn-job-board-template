'use client';

import {
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from 'react';

import { m } from '../paraglide/messages';

import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import {
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
} from '@/components/ui/combobox-chips';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FieldError } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';

export type TagListDialogCopy = {
  heading: string;
  placeholder: string;
  removeAriaLabel: (item: string) => string;
};

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

/**
 * The Skills / Interested roles editor. Mounted while open, so each open
 * starts from the saved list; Cancel discards the draft, Save hands the whole
 * list (plus any text typed but not entered) to `onSave`.
 */
export function TagListDialog({
  id,
  items,
  copy,
  pending,
  error,
  onCancel,
  onSave,
}: {
  id: string;
  items: string[];
  copy: TagListDialogCopy;
  pending: boolean;
  error: string | null;
  onCancel: () => void;
  onSave: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState(items);
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

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

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next && !pending) onCancel();
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
            if (pending) return;
            // Text typed but not yet entered is saved too.
            const next = [...draft, ...newTagEntries(draft, input)];
            setDraft(next);
            setInput('');
            onSave(next);
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
            {error ? <FieldError id={`${id}-error`}>{error}</FieldError> : null}
          </div>
          {/* Overlay editors right-align their footer, Cancel before the
              primary — the Dialog/Sheet/AlertDialog convention. */}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              onClick={onCancel}
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
  );
}
