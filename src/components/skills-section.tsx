'use client';

import { Suspense, lazy, useEffect, useState } from 'react';

import { useRouter } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { replaceInterestedRoles, replaceSkills } from '../server/account';

import type { TagListDialogCopy } from './tag-list-dialog';
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
import { reconcileCommittedAction } from '@/lib/action-toast';
import { boardErrorMessage } from '@/lib/board-error-message';

type SaveResult = { ok: true } | { ok: false; code: string; message: string };

type TagListCopy = TagListDialogCopy & {
  description: string;
  addLabel: string;
};

// The editor (Dialog + combobox chips) loads on first open, so the profile
// page does not carry it in its first load.
const LazyTagListDialog = lazy(() =>
  import('./tag-list-dialog').then(({ TagListDialog }) => ({
    default: TagListDialog,
  })),
);

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
        // `UpdateSkillsBody.skills` maxItems; skill names have no length cap.
        maxItems: 200,
        tooManyText: (max) => m.skillsSection_tooManyError({ max }),
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
        // `UpdateCandidateProfileBody.interestedRoles`: maxItems and each
        // role's maxLength.
        maxItems: 50,
        maxLength: 100,
        tooManyText: (max) => m.interestedRolesSection_tooManyError({ max }),
        tooLongText: (max) => m.interestedRolesSection_tooLongError({ max }),
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
  persist: (next: string[]) => Promise<SaveResult>;
  copy: TagListCopy;
}) {
  const router = useRouter();
  const [items, setValues] = useState(initialValues);
  useEffect(() => setValues(initialValues), [initialValues]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const save = async (next: string[]) => {
    if (pending) return;
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
            onClick={() => {
              setError(null);
              setOpen(true);
            }}
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
      {open ? (
        <Suspense fallback={null}>
          <LazyTagListDialog
            id={id}
            items={items}
            copy={copy}
            pending={pending}
            error={error}
            onCancel={() => setOpen(false)}
            onSave={(next) => void save(next)}
          />
        </Suspense>
      ) : null}
    </Card>
  );
}
