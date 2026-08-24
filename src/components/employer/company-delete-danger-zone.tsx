'use client';

import { useState } from 'react';

import { m } from '../../paraglide/messages';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

export type CompanyDeleteActions = {
  deleteCompany: (
    ...args: Parameters<typeof import('../../server/employers').deleteCompany>
  ) => Promise<
    { ok: true; data?: null } | { ok: false; code: string; message: string }
  >;
  invalidate: () => Promise<void>;
  navigateToDashboard: () => Promise<void>;
  toastSuccess: (message: string) => void;
};

const CONFIRM_WORD = () => m.dangerZone_confirmWord();

export function CompanyDeleteDangerZone({
  slug,
  companyName,
  isAdmin,
  otherApprovedMembers,
  actions,
}: {
  slug: string;
  companyName: string;
  isAdmin: boolean;
  otherApprovedMembers: number;
  actions: CompanyDeleteActions;
}) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState<'idle' | 'deleting' | 'error'>('idle');
  const [disabledReason, setDisabledReason] = useState<
    'not_admin' | 'company_deletion_disabled' | null
  >(isAdmin ? null : 'not_admin');
  const [hidden, setHidden] = useState(false);

  if (hidden) return null;

  const description =
    disabledReason === 'not_admin'
      ? m.employerDelete_notAdminText()
      : disabledReason === 'company_deletion_disabled'
        ? m.employerDelete_disabledText()
        : m.employerDelete_warningText();
  const disabled = disabledReason !== null;

  // Job postings are deliberately uncounted ("all of its job postings");
  // members stay counted because the number is small and personal.
  function consequence(): string {
    if (otherApprovedMembers === 0) {
      return m.employerDelete_consequenceSolo({ company: companyName });
    }
    const members =
      otherApprovedMembers === 1
        ? m.employerDelete_membersCountOne({ count: otherApprovedMembers })
        : m.employerDelete_membersCountMany({
            count: otherApprovedMembers,
          });
    return m.employerDelete_consequence({
      company: companyName,
      members,
    });
  }

  return (
    <Card
      className="ring-destructive/40"
      data-test="company-delete-danger-zone"
    >
      <CardHeader>
        <CardTitle>
          <h2 className="text-destructive">{m.employerDelete_heading()}</h2>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardFooter className="justify-end border-t">
        <AlertDialog
          open={open}
          onOpenChange={(nextOpen) => {
            if (!nextOpen && status === 'deleting') return;
            setOpen(nextOpen);
            if (!nextOpen) {
              setConfirm('');
              setStatus('idle');
            }
          }}
        >
          <AlertDialogTrigger
            render={<Button variant="destructive" disabled={disabled} />}
          >
            {m.employerDelete_submitLabel()}
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {m.employerDelete_submitLabel()}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {m.employerDelete_warningText()}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <p className="text-sm">{consequence()}</p>
            <Field data-invalid={status === 'error' || undefined}>
              <FieldLabel htmlFor="delete-company-confirmation">
                {m.dangerZone_confirmLabel({ word: CONFIRM_WORD() })}
              </FieldLabel>
              <Input
                id="delete-company-confirmation"
                value={confirm}
                autoComplete="off"
                aria-invalid={status === 'error' || undefined}
                onChange={(event) => setConfirm(event.target.value)}
              />
              {status === 'error' ? (
                <FieldError>{m.employerDelete_errorText()}</FieldError>
              ) : null}
            </Field>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={status === 'deleting'}>
                {m.dangerZone_cancelLabel()}
              </AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={confirm !== CONFIRM_WORD() || status === 'deleting'}
                onClick={async () => {
                  setStatus('deleting');
                  try {
                    const result = await actions.deleteCompany({
                      data: { slug },
                    });
                    if (!result.ok) {
                      if (result.code === 'company_deletion_disabled') {
                        setDisabledReason('company_deletion_disabled');
                        setHidden(true);
                        setOpen(false);
                        return;
                      }
                      if (result.code === 'not_company_admin') {
                        setDisabledReason('not_admin');
                        setOpen(false);
                        return;
                      }
                      setStatus('error');
                      return;
                    }
                    actions.toastSuccess(
                      m.employerDelete_deletedToast({ company: companyName }),
                    );
                    await actions.invalidate();
                    await actions.navigateToDashboard();
                    setOpen(false);
                  } catch {
                    setStatus('error');
                  }
                }}
              >
                {status === 'deleting'
                  ? m.employerDelete_deletingLabel()
                  : m.employerDelete_confirmButton()}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}
