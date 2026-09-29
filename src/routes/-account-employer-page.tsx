/**
 * The employer view of `/account`, colocated with the route as a non-route
 * module (leading `-`). Hosted parity: an employer-only board user has no
 * candidate profile, so `/account` shows how they appear to candidates (avatar
 * and display name) with a link on to the employer dashboard, instead of the
 * candidate profile editor. The save sends `displayName` alone — the one
 * profile field the API accepts from a user without a candidate profile.
 */
import { useState } from 'react';

import { Link, useRouter } from '@tanstack/react-router';

import { AvatarUpload } from '../components/avatar-upload';
import { m } from '../paraglide/messages';
import { updateProfile } from '../server/account';

import { CandidateShell } from '@/components/candidate-shell';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  reconcileCommittedAction,
  toastActionError,
  toastActionReconciliationError,
  toastActionSuccess,
} from '@/lib/action-toast';
import type { BoardUser, CandidateProfile } from '@cavuno/board';

export interface EmployerAccountDependencies {
  updateProfile: (
    input: Parameters<typeof updateProfile>[0],
  ) => ReturnType<typeof updateProfile>;
  toastActionError: () => void | Promise<void>;
  toastActionReconciliationError: () => void | Promise<void>;
  toastActionSuccess: () => void | Promise<void>;
}

const employerAccountDependencies: EmployerAccountDependencies = {
  updateProfile,
  toastActionError,
  toastActionReconciliationError,
  toastActionSuccess,
};

/** "Ada's employer profile", or "Your employer profile" without a name. */
function employerHeading(displayName: string | null): string {
  const firstName = displayName?.trim().split(/\s+/)[0];
  return firstName
    ? m.accountEmployer_heading({ firstName })
    : m.accountEmployer_headingFallback();
}

export function EmployerAccountPageView({
  me,
  profile,
  dependencies = employerAccountDependencies,
}: {
  me: BoardUser;
  profile: CandidateProfile;
  dependencies?: EmployerAccountDependencies;
}) {
  const displayName = profile.displayName ?? me.displayName;
  return (
    <CandidateShell
      title={employerHeading(me.displayName)}
      description={m.accountEmployer_description()}
    >
      <Card id="profile">
        <CardHeader>
          <CardTitle>
            <h2>{m.accountHome_profileHeading()}</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <AvatarUpload
            avatarUrl={profile.avatarUrl}
            displayName={displayName}
          />
          <EmployerProfileForm
            displayName={displayName ?? ''}
            dependencies={dependencies}
          />
        </CardContent>
      </Card>
    </CandidateShell>
  );
}

function EmployerProfileForm({
  displayName: storedName,
  dependencies,
}: {
  displayName: string;
  dependencies: EmployerAccountDependencies;
}) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(storedName);
  const [saving, setSaving] = useState(false);
  const [missingName, setMissingName] = useState(false);

  async function save() {
    const name = displayName.trim();
    setMissingName(!name);
    if (!name) return;
    setSaving(true);
    try {
      const result = await dependencies.updateProfile({
        data: { displayName: name },
      });
      if (!result.ok) throw new Error(result.code);
    } catch {
      setSaving(false);
      void dependencies.toastActionError();
      return;
    }
    setSaving(false);
    void dependencies.toastActionSuccess();
    await reconcileCommittedAction(
      () => router.invalidate(),
      dependencies.toastActionReconciliationError,
    );
  }

  return (
    <form
      method="post"
      data-test="employer-profile-form"
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        await save();
      }}
    >
      <FieldGroup className="gap-4">
        <Field
          className="gap-1.5"
          data-invalid={missingName ? true : undefined}
        >
          <FieldLabel htmlFor="employer-display-name">
            {m.profileForm_displayNameLabel()}
          </FieldLabel>
          <Input
            id="employer-display-name"
            value={displayName}
            aria-required="true"
            aria-invalid={missingName ? true : undefined}
            aria-describedby={
              missingName ? 'employer-display-name-error' : undefined
            }
            onChange={(event) => {
              setDisplayName(event.target.value);
              setMissingName(false);
            }}
          />
          {missingName ? (
            <FieldError id="employer-display-name-error">
              {m.profileForm_fieldRequiredError({
                field: m.profileForm_displayNameLabel(),
              })}
            </FieldError>
          ) : null}
        </Field>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? m.profileForm_savingLabel() : m.profileForm_saveLabel()}
          </Button>
          <Link
            to="/employers/dashboard"
            className={buttonVariants({ variant: 'outline' })}
          >
            {m.accountEmployer_dashboardLink()}
          </Link>
        </div>
      </FieldGroup>
    </form>
  );
}
