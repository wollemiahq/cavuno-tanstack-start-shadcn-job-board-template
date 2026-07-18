'use client';

import { useState } from 'react';

import { useRouter } from '@tanstack/react-router';
import { Languages, Pencil, Trash2 } from 'lucide-react';

import { m } from '../paraglide/messages';
import { replaceLanguages } from '../server/account';

import {
  CandidateActionFeedback,
  type CandidateActionFeedbackState,
} from '@/components/candidate-action-feedback';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from '@/components/ui/empty';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

type Language = { name: string; proficiency: string };

/** `index: null` = adding; a number = editing that row. */
type Editing = { index: number | null } | null;

const LEVELS = [
  m.languagesSection_levelNative,
  m.languagesSection_levelFluent,
  m.languagesSection_levelProfessional,
  m.languagesSection_levelConversational,
  m.languagesSection_levelBasic,
];

/**
 * Languages — name + proficiency entries over the whole-set replace
 * (`board.me.profile.updateLanguages`). Add opens a dialog, edit a right-hand
 * sheet — the same editor pattern as experience/education. Proficiency is a
 * free string on the API; the select offers the five common levels and keeps
 * any previously stored custom value selectable so an edit round-trip cannot
 * lose it.
 */
export function LanguagesSection({ languages }: { languages: Language[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Editing>(null);
  const [draft, setDraft] = useState<Language>({ name: '', proficiency: '' });
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] =
    useState<CandidateActionFeedbackState>('idle');

  const levelLabels: string[] = LEVELS.map((level) => level());

  const persist = async (next: Language[]): Promise<boolean> => {
    setPending(true);
    setFeedback('idle');
    try {
      await replaceLanguages({ data: { languages: next } });
      await router.invalidate();
      return true;
    } catch {
      setFeedback('error');
      return false;
    } finally {
      setPending(false);
    }
  };

  const submit = async () => {
    const entry = {
      name: draft.name.trim(),
      proficiency: draft.proficiency.trim(),
    };
    if (!entry.name || !entry.proficiency) return;
    const next =
      editing && editing.index !== null
        ? languages.map((language, index) =>
            index === editing.index ? entry : language,
          )
        : [...languages, entry];
    if (await persist(next)) setEditing(null);
  };

  const open = (index: number | null) => {
    setDraft(
      index === null ? { name: '', proficiency: '' } : { ...languages[index]! },
    );
    setEditing({ index });
  };

  const addButton = (
    <Button variant="outline" size="sm" onClick={() => open(null)}>
      {m.languagesSection_addLabel()}
    </Button>
  );

  const levels =
    !draft.proficiency || levelLabels.includes(draft.proficiency)
      ? levelLabels
      : [draft.proficiency, ...levelLabels];

  const editorForm =
    editing !== null ? (
      <form
        key={editing.index ?? 'new'}
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <FieldGroup className="gap-3">
          <Field className="gap-1.5">
            <FieldLabel htmlFor="language-name">
              {m.languagesSection_languageLabel()}
            </FieldLabel>
            <Input
              id="language-name"
              required
              value={draft.name}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, name: event.target.value }))
              }
            />
          </Field>
          <Field className="gap-1.5">
            <FieldLabel htmlFor="language-proficiency">
              {m.languagesSection_proficiencyLabel()}
            </FieldLabel>
            <Select
              items={levels.map((level) => ({ label: level, value: level }))}
              value={draft.proficiency || null}
              required
              onValueChange={(proficiency) =>
                setDraft((prev) => ({
                  ...prev,
                  proficiency: (proficiency as string | null) ?? '',
                }))
              }
            >
              <SelectTrigger
                id="language-proficiency"
                className="w-full"
                aria-label={m.languagesSection_proficiencyLabel()}
              >
                <SelectValue
                  placeholder={m.languagesSection_proficiencyLabel()}
                />
              </SelectTrigger>
              <SelectContent>
                {levels.map((level) => (
                  <SelectItem key={level} value={level}>
                    {level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {/* Overlay editors right-align their footer, Cancel before the
              primary — the Dialog/Sheet/AlertDialog convention. */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => setEditing(null)}
            >
              {m.languagesSection_cancelLabel()}
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={pending || !draft.name.trim() || !draft.proficiency}
            >
              {pending
                ? m.languagesSection_savingLabel()
                : m.languagesSection_saveLabel()}
            </Button>
          </div>
        </FieldGroup>
      </form>
    ) : null;

  return (
    <Card data-test="languages-section" id="languages">
      <CardHeader>
        <CardTitle>
          <h2>{m.languagesSection_heading()}</h2>
        </CardTitle>
        {languages.length > 0 ? <CardAction>{addButton}</CardAction> : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {languages.length === 0 ? (
          <Empty className="border-0 p-8">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Languages aria-hidden="true" />
              </EmptyMedia>
              <EmptyDescription>
                {m.languagesSection_emptyText()}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>{addButton}</EmptyContent>
          </Empty>
        ) : (
          // A language is atomic (name + level), so it gets the compact row
          // treatment of Skills — not the bordered cards Experience and
          // Education use for their richer entries.
          <ul className="divide-border divide-y">
            {languages.map((language, index) => (
              <li
                key={index}
                className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
              >
                <div className="grid min-w-0 gap-x-3 gap-y-0.5 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)] sm:items-baseline">
                  <span className="text-foreground truncate font-medium">
                    {language.name}
                  </span>
                  <span className="text-muted-foreground truncate text-sm">
                    {language.proficiency}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={m.languagesSection_editTitle()}
                    title={m.languagesSection_editTitle()}
                    onClick={() => open(index)}
                  >
                    <Pencil aria-hidden />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={m.languagesSection_removeLanguageAriaLabel()}
                    title={m.languagesSection_removeLanguageAriaLabel()}
                    disabled={pending}
                    onClick={() =>
                      void persist(languages.filter((_, i) => i !== index))
                    }
                  >
                    <Trash2 aria-hidden />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <CandidateActionFeedback state={feedback} />

        <Dialog
          open={editing !== null && editing.index === null}
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{m.languagesSection_addLabel()}</DialogTitle>
            </DialogHeader>
            {editorForm}
          </DialogContent>
        </Dialog>

        <Sheet
          open={editing !== null && editing.index !== null}
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
        >
          <SheetContent side="right" className="w-full gap-0 sm:max-w-lg">
            <SheetHeader>
              <SheetTitle>{m.languagesSection_editTitle()}</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto p-4 pt-2">{editorForm}</div>
          </SheetContent>
        </Sheet>
      </CardContent>
    </Card>
  );
}
