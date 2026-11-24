'use client';

import { useEffect, useState } from 'react';

import { useRouter } from '@tanstack/react-router';
import { Sparkles, Target, X, type LucideIcon } from 'lucide-react';

import { m } from '../paraglide/messages';
import { replaceInterestedRoles, replaceSkills } from '../server/account';

import { Badge } from '@/components/ui/badge';
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
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { reconcileCommittedAction, toastActionError } from '@/lib/action-toast';

type TagListCopy = {
  emptyIcon: LucideIcon;
  heading: string;
  emptyText: string;
  addLabel: string;
  fieldLabel: string;
  removeAriaLabel: (item: string) => string;
};

/**
 * Skills — badges over the whole-set replace
 * (`board.me.profile.updateSkills`). Adding happens in an "Add skill" dialog
 * (the LinkedIn flow); add and remove each persist immediately with one PUT.
 */
export function SkillsSection({ skills }: { skills: string[] }) {
  return (
    <TagListSection
      id="skills"
      items={skills}
      persist={async (next) => {
        await replaceSkills({ data: { skills: next } });
      }}
      copy={{
        emptyIcon: Sparkles,
        heading: m.skillsSection_heading(),
        emptyText: m.skillsSection_emptyText(),
        addLabel: m.skillsSection_addLabel(),
        fieldLabel: m.skillsSection_addSkillLabel(),
        removeAriaLabel: (skill) =>
          m.skillsSection_removeSkillAriaLabel({ skill }),
      }}
    />
  );
}

/**
 * Interested roles — the same badge list over the profile's `interestedRoles`
 * (`board.me.profile.update`, which replaces the list). Job matches rank on
 * skills and interested roles.
 */
export function InterestedRolesSection({ roles }: { roles: string[] }) {
  return (
    <TagListSection
      id="interested-roles"
      items={roles}
      persist={async (next) => {
        await replaceInterestedRoles({ data: { roles: next } });
      }}
      copy={{
        emptyIcon: Target,
        heading: m.interestedRolesSection_heading(),
        emptyText: m.interestedRolesSection_emptyText(),
        addLabel: m.interestedRolesSection_addLabel(),
        fieldLabel: m.interestedRolesSection_addRoleLabel(),
        removeAriaLabel: (role) =>
          m.interestedRolesSection_removeRoleAriaLabel({ role }),
      }}
    />
  );
}

function TagListSection({
  id,
  items: initialValues,
  persist,
  copy,
}: {
  id: string;
  items: string[];
  persist: (next: string[]) => Promise<void>;
  copy: TagListCopy;
}) {
  const router = useRouter();
  const [items, setValues] = useState(initialValues);
  useEffect(() => setValues(initialValues), [initialValues]);
  const [adding, setAdding] = useState(false);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);

  const save = async (next: string[]): Promise<boolean> => {
    if (pending) return false;
    setPending(true);
    try {
      await persist(next);
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

  const submitAdd = async () => {
    if (pending) return;
    const name = input.trim();
    if (!name) return;
    if (items.includes(name)) {
      setInput('');
      setAdding(false);
      return;
    }
    if (await save([...items, name])) {
      setInput('');
      setAdding(false);
    }
  };

  const addButton = (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        setInput('');
        setAdding(true);
      }}
    >
      {copy.addLabel}
    </Button>
  );

  return (
    <Card data-test={`${id}-section`} id={id}>
      <CardHeader>
        <CardTitle>
          <h2>{copy.heading}</h2>
        </CardTitle>
        {items.length > 0 ? <CardAction>{addButton}</CardAction> : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <Empty className="border-0 p-8">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <copy.emptyIcon aria-hidden="true" />
              </EmptyMedia>
              <EmptyDescription>{copy.emptyText}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>{addButton}</EmptyContent>
          </Empty>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {items.map((item) => (
              <Badge
                key={item}
                variant="secondary"
                render={<li />}
                className="h-6 gap-0.5 pe-0.5"
              >
                {item}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label={copy.removeAriaLabel(item)}
                  className="text-muted-foreground hover:text-foreground size-5 rounded-full"
                  disabled={pending}
                  onClick={() => void save(items.filter((i) => i !== item))}
                >
                  <X className="size-3.5" />
                </Button>
              </Badge>
            ))}
          </ul>
        )}

        <Dialog
          open={adding}
          onOpenChange={(open) => {
            if (!open && !pending) setAdding(false);
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{copy.addLabel}</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void submitAdd();
              }}
              className="space-y-4"
            >
              <Field className="gap-1.5">
                <FieldLabel htmlFor={`${id}-name`}>
                  {copy.fieldLabel}
                </FieldLabel>
                <Input
                  id={`${id}-name`}
                  disabled={pending}
                  required
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                />
              </Field>
              {/* Overlay editors right-align their footer, Cancel before the
                  primary — the Dialog/Sheet/AlertDialog convention. */}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => setAdding(false)}
                >
                  {m.skillsSection_cancelLabel()}
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={pending || !input.trim()}
                >
                  {pending
                    ? m.skillsSection_savingLabel()
                    : m.skillsSection_saveLabel()}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
