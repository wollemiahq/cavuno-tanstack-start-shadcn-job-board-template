'use client';

import { useState } from 'react';

import { useRouter } from '@tanstack/react-router';
import { Sparkles, X } from 'lucide-react';

import { m } from '../paraglide/messages';
import { replaceSkills } from '../server/account';

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

/**
 * Skills — badges over the whole-set replace
 * (`board.me.profile.updateSkills`). Adding happens in an "Add skill" dialog
 * (the LinkedIn flow); add and remove each persist immediately with one PUT.
 */
export function SkillsSection({ skills }: { skills: string[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);

  const save = async (next: string[]): Promise<boolean> => {
    setPending(true);
    try {
      await replaceSkills({ data: { skills: next } });
    } catch {
      void toastActionError();
      return false;
    } finally {
      setPending(false);
    }
    await reconcileCommittedAction(() => router.invalidate());
    return true;
  };

  const submitAdd = async () => {
    const name = input.trim();
    if (!name) return;
    if (skills.includes(name)) {
      setInput('');
      setAdding(false);
      return;
    }
    if (await save([...skills, name])) {
      setInput('');
      setAdding(false);
    }
  };

  const addButton = (
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        setInput('');
        setAdding(true);
      }}
    >
      {m.skillsSection_addLabel()}
    </Button>
  );

  return (
    <Card data-test="skills-section" id="skills">
      <CardHeader>
        <CardTitle>
          <h2>{m.skillsSection_heading()}</h2>
        </CardTitle>
        {skills.length > 0 ? <CardAction>{addButton}</CardAction> : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {skills.length === 0 ? (
          <Empty className="border-0 p-8">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Sparkles aria-hidden="true" />
              </EmptyMedia>
              <EmptyDescription>{m.skillsSection_emptyText()}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>{addButton}</EmptyContent>
          </Empty>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <Badge
                key={skill}
                variant="secondary"
                render={<li />}
                className="h-6 gap-0.5 pe-0.5"
              >
                {skill}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label={m.skillsSection_removeSkillAriaLabel({ skill })}
                  className="text-muted-foreground hover:text-foreground size-5 rounded-full"
                  disabled={pending}
                  onClick={() => void save(skills.filter((s) => s !== skill))}
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
            if (!open) setAdding(false);
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{m.skillsSection_addLabel()}</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void submitAdd();
              }}
              className="space-y-4"
            >
              <Field className="gap-1.5">
                <FieldLabel htmlFor="skill-name">
                  {m.skillsSection_addSkillLabel()}
                </FieldLabel>
                <Input
                  id="skill-name"
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
