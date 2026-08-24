'use client';

import { useState } from 'react';

import { LogOut, Trash2 } from 'lucide-react';

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
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FieldError } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { CompanyMember, CompanyMemberInvite } from '@cavuno/board';

export type CompanyMembersTableActions = {
  updateCompanyMemberRole: (
    ...args: Parameters<
      typeof import('../../server/employers').updateCompanyMemberRole
    >
  ) => Promise<
    | { ok: true; data?: object | null }
    | { ok: false; code: string; message: string }
  >;
  removeCompanyMember: (
    ...args: Parameters<
      typeof import('../../server/employers').removeCompanyMember
    >
  ) => Promise<
    | { ok: true; data?: object | null }
    | { ok: false; code: string; message: string }
  >;
  revokeCompanyInvite: (
    ...args: Parameters<
      typeof import('../../server/employers').revokeCompanyInvite
    >
  ) => Promise<
    | { ok: true; data?: object | null }
    | { ok: false; code: string; message: string }
  >;
  leaveCompany: (
    ...args: Parameters<typeof import('../../server/employers').leaveCompany>
  ) => Promise<
    | { ok: true; data?: object | null }
    | { ok: false; code: string; message: string }
  >;
  invalidate: () => Promise<void>;
  navigateToDashboard: () => Promise<void>;
  toastError: (message: string) => void;
  toastSuccess: (message: string) => void;
};

const ROLE_ITEMS = {
  admin: () => m.employerMembers_roleAdmin(),
  member: () => m.employerMembers_roleMember(),
};

function memberDisplayName(member: CompanyMember): string {
  const name = member.displayName?.trim();
  if (name) return name;
  return member.email.split('@')[0] || member.email;
}

function sortMembers(members: CompanyMember[]): CompanyMember[] {
  return [...members].sort((a, b) => {
    const created = a.createdAt.localeCompare(b.createdAt);
    if (created !== 0) return created;
    return a.id.localeCompare(b.id);
  });
}

function sortInvites(invites: CompanyMemberInvite[]): CompanyMemberInvite[] {
  return [...invites].sort((a, b) => {
    const created = a.createdAt.localeCompare(b.createdAt);
    if (created !== 0) return created;
    return a.id.localeCompare(b.id);
  });
}

/**
 * Fixed locale so the server render and the browser agree on the string
 * (a bare toLocaleDateString would hydration-mismatch the tooltip).
 */
function formatExpiryDate(timestamp: number | string): string {
  return new Date(timestamp).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function CompanyMembersTable({
  slug,
  companyName,
  members,
  invites,
  isAdmin,
  currentUserId,
  actions,
}: {
  slug: string;
  companyName: string;
  members: CompanyMember[];
  invites: CompanyMemberInvite[];
  isAdmin: boolean;
  currentUserId: string;
  actions: CompanyMembersTableActions;
}) {
  const [lastAdminError, setLastAdminError] = useState(false);
  const [leaveLastAdminError, setLeaveLastAdminError] = useState(false);
  // Prevent rather than punish: disable Leave with the reason as a
  // tooltip when the client can already tell it would fail (sole admin
  // or only member). The server guard stays authoritative.
  const viewerRow = members.find((mem) => mem.boardUserId === currentUserId);
  const adminCount = members.filter((mem) => mem.role === 'admin').length;
  const leaveBlockedReason =
    viewerRow?.role === 'admin' && adminCount <= 1
      ? members.length <= 1
        ? m.employerMembers_leaveOnlyMemberTooltip()
        : m.employerMembers_leaveLastAdminError()
      : null;
  const [pendingMemberId, setPendingMemberId] = useState<string | null>(null);
  const [pendingInviteId, setPendingInviteId] = useState<string | null>(null);
  const [removeMemberId, setRemoveMemberId] = useState<string | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);

  const removeTarget = members.find((member) => member.id === removeMemberId);
  const memberRows = sortMembers(members);
  const inviteRows = sortInvites(invites);
  const isEmpty = memberRows.length === 0 && inviteRows.length === 0;

  async function changeRole(member: CompanyMember, nextRole: string) {
    if (nextRole !== 'admin' && nextRole !== 'member') return;
    if (nextRole === member.role) return;
    setLastAdminError(false);
    setPendingMemberId(member.id);
    try {
      const result = await actions.updateCompanyMemberRole({
        data: {
          slug,
          memberId: member.id,
          body: { role: nextRole },
        },
      });
      if (!result.ok) {
        if (result.code === 'last_admin') {
          setLastAdminError(true);
        } else {
          actions.toastError(m.employerMembers_updateError());
        }
        return;
      }
      await actions.invalidate();
    } catch {
      actions.toastError(m.employerMembers_updateError());
    } finally {
      setPendingMemberId(null);
    }
  }

  async function confirmRemove(member: CompanyMember) {
    setLastAdminError(false);
    setPendingMemberId(member.id);
    try {
      const result = await actions.removeCompanyMember({
        data: { slug, memberId: member.id },
      });
      if (!result.ok) {
        if (result.code === 'last_admin') {
          setLastAdminError(true);
          setRemoveMemberId(null);
        } else {
          actions.toastError(m.employerMembers_updateError());
        }
        return;
      }
      setRemoveMemberId(null);
      await actions.invalidate();
    } catch {
      actions.toastError(m.employerMembers_updateError());
    } finally {
      setPendingMemberId(null);
    }
  }

  async function confirmLeave() {
    setLeaveLastAdminError(false);
    setPendingMemberId('self');
    try {
      const result = await actions.leaveCompany({ data: { slug } });
      if (!result.ok) {
        if (result.code === 'last_admin') {
          setLeaveLastAdminError(true);
        } else {
          actions.toastError(m.employerMembers_updateError());
        }
        return;
      }
      actions.toastSuccess(
        m.employerMembers_leaveSuccessToast({ company: companyName }),
      );
      await actions.navigateToDashboard();
      setLeaveOpen(false);
    } catch {
      actions.toastError(m.employerMembers_updateError());
    } finally {
      setPendingMemberId(null);
    }
  }

  async function revoke(inviteId: string) {
    setPendingInviteId(inviteId);
    try {
      const result = await actions.revokeCompanyInvite({
        data: { slug, inviteId },
      });
      if (!result.ok) {
        actions.toastError(m.employerMembers_revokeError());
        return;
      }
      await actions.invalidate();
    } catch {
      actions.toastError(m.employerMembers_revokeError());
    } finally {
      setPendingInviteId(null);
    }
  }

  return (
    <Card data-test="company-members-table" className="py-0">
      <CardContent className="space-y-3">
        {lastAdminError ? (
          <FieldError>{m.employerMembers_lastAdminError()}</FieldError>
        ) : null}
        {isEmpty ? (
          <p className="text-muted-foreground text-sm">
            {m.employerMembers_emptyText()}
          </p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{m.employerMembers_nameColumn()}</TableHead>
                  <TableHead>{m.employerMembers_emailColumn()}</TableHead>
                  <TableHead>{m.employerMembers_roleColumn()}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {memberRows.map((member) => {
                  const isSelf = member.boardUserId === currentUserId;
                  const name = memberDisplayName(member);
                  return (
                    <TableRow key={member.id}>
                      <TableCell>{name}</TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell>
                        {isAdmin ? (
                          <Select
                            items={{
                              admin: ROLE_ITEMS.admin(),
                              member: ROLE_ITEMS.member(),
                            }}
                            value={member.role}
                            onValueChange={(value) => {
                              if (value) void changeRole(member, String(value));
                            }}
                            disabled={pendingMemberId === member.id}
                          >
                            <SelectTrigger
                              aria-label={m.employerMembers_roleColumn()}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">
                                {ROLE_ITEMS.admin()}
                              </SelectItem>
                              <SelectItem value="member">
                                {ROLE_ITEMS.member()}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge
                            variant={
                              member.role === 'admin' ? 'default' : 'outline'
                            }
                          >
                            {member.role === 'admin'
                              ? ROLE_ITEMS.admin()
                              : ROLE_ITEMS.member()}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {isSelf ? (
                          leaveBlockedReason ? (
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <span className="inline-flex" tabIndex={0} />
                                }
                              >
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  aria-label={m.employerMembers_leaveAriaLabel({
                                    company: companyName,
                                  })}
                                  disabled
                                >
                                  <LogOut aria-hidden />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {leaveBlockedReason}
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={m.employerMembers_leaveAriaLabel({
                                company: companyName,
                              })}
                              onClick={() => {
                                setLeaveLastAdminError(false);
                                setLeaveOpen(true);
                              }}
                            >
                              <LogOut aria-hidden />
                            </Button>
                          )
                        ) : isAdmin ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={m.employerMembers_removeAriaLabel({
                              name,
                            })}
                            onClick={() => setRemoveMemberId(member.id)}
                          >
                            <Trash2 aria-hidden />
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {inviteRows.map((invite) => (
                  <TableRow key={invite.id}>
                    <TableCell>-</TableCell>
                    <TableCell>{invite.email}</TableCell>
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger
                          render={<span className="inline-flex" tabIndex={0} />}
                        >
                          <Badge variant="secondary">
                            {m.employerMembers_invitedColumn()}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          {m.employerMembers_expiresTooltip({
                            date: formatExpiryDate(invite.expiresAt),
                          })}
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      {isAdmin ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={m.employerMembers_revokeAriaLabel({
                            email: invite.email,
                          })}
                          disabled={pendingInviteId === invite.id}
                          onClick={() => void revoke(invite.id)}
                        >
                          <Trash2 aria-hidden />
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </CardContent>
      <AlertDialog
        open={leaveOpen}
        onOpenChange={(open) => {
          setLeaveOpen(open);
          if (!open) setLeaveLastAdminError(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {m.employerMembers_leaveDialogTitle({ company: companyName })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {m.employerMembers_leaveDialogBody({ company: companyName })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {leaveLastAdminError ? (
            <FieldError>{m.employerMembers_leaveLastAdminError()}</FieldError>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>{m.dangerZone_cancelLabel()}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pendingMemberId === 'self'}
              onClick={async () => {
                await confirmLeave();
              }}
            >
              {m.employerMembers_leaveConfirmLabel()}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={Boolean(removeTarget)}
        onOpenChange={(open) => {
          if (!open) setRemoveMemberId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {m.employerMembers_removeDialogTitle()}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {removeTarget
                ? m.employerMembers_removeDialogBody({
                    name: memberDisplayName(removeTarget),
                  })
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{m.dangerZone_cancelLabel()}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pendingMemberId === removeTarget?.id}
              onClick={async () => {
                if (removeTarget) await confirmRemove(removeTarget);
              }}
            >
              {m.employerMembers_removeConfirmLabel()}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
