import { useState } from 'react';

import { Lock } from 'lucide-react';

import { planName } from '@/board/plan-labels';
import { EmptyState } from '@/components/empty-state';
import { Page, PageContent } from '@/components/layout/page';
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
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { m } from '@/paraglide/messages';
import { getLocale } from '@/paraglide/runtime';
import { TalentProfileSilhouette } from '@/routes/-talent-profile-silhouette';
import type { Plan } from '@cavuno/board';

export function TalentUnlockPending() {
  return (
    <Page width="content">
      <PageContent>
        <EmptyState
          icon={<Spinner className="size-5" />}
          title={m.talentUnlock_pendingTitle()}
          description={m.talentUnlock_pendingBody()}
        />
      </PageContent>
    </Page>
  );
}

export function TalentUnlockGate({
  surface,
  creditsRemaining,
  plans,
  profile,
  busy,
  onUnlock,
  onUpgrade,
}: {
  surface: 'unlock_needed' | 'out_of_unlocks' | 'no_plan';
  creditsRemaining: number;
  plans: Plan[];
  /**
   * The redacted profile, rendered beneath the upsell as a silhouette. The
   * gate converts on how much is visibly behind it, so every state shows it.
   */
  profile: Parameters<typeof TalentProfileSilhouette>[0]['profile'];
  busy: 'unlock' | string | null;
  onUnlock: () => Promise<void> | void;
  onUpgrade: (planId: string) => Promise<void> | void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (surface === 'no_plan') {
    return (
      <Page width="content">
        <PageContent>
          <EmptyState
            icon={<Lock aria-hidden="true" />}
            title={m.talentUnlock_noPlanTitle()}
            description={m.talentUnlock_noPlanBody()}
            action={
              <a
                href="/employers"
                className={buttonVariants({ variant: 'outline' })}
              >
                {m.talentUnlock_viewPlansLabel()}
              </a>
            }
          />
          <TalentProfileSilhouette profile={profile} />
        </PageContent>
      </Page>
    );
  }

  if (surface === 'out_of_unlocks') {
    return (
      <Page width="content">
        <PageContent>
          <div className="space-y-6">
            <EmptyState
              icon={<Lock aria-hidden="true" />}
              title={m.talentUnlock_outOfUnlocksTitle()}
              description={m.talentUnlock_outOfUnlocksBody()}
            />
            {plans.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {plans.map((plan) => (
                  <Card key={plan.id}>
                    <CardHeader>
                      <CardTitle>{planName(plan)}</CardTitle>
                    </CardHeader>
                    <CardFooter>
                      <Button
                        className="w-full"
                        disabled={busy !== null}
                        onClick={() => void onUpgrade(plan.id)}
                      >
                        {busy === plan.id
                          ? m.talentUnlock_upgradingLabel()
                          : m.talentUnlock_upgradeLabel()}
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <a
                href="/employers"
                className={buttonVariants({ variant: 'outline' })}
              >
                {m.talentUnlock_viewPlansLabel()}
              </a>
            )}
            <TalentProfileSilhouette profile={profile} />
          </div>
        </PageContent>
      </Page>
    );
  }

  return (
    <Page width="content">
      <PageContent>
        <Card>
          <CardHeader>
            <CardTitle>{m.talentUnlock_neededTitle()}</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-2 text-sm">
            <p>{m.talentUnlock_neededBody()}</p>
            <p>
              {m.talentUnlock_creditsRemaining({
                count: creditsRemaining,
                countLabel: creditsRemaining.toLocaleString(getLocale()),
              })}
            </p>
          </CardContent>
          <CardFooter>
            <Button
              disabled={busy !== null}
              onClick={() => setConfirmOpen(true)}
            >
              {m.talentUnlock_confirmAction()}
            </Button>
          </CardFooter>
        </Card>
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {m.talentUnlock_confirmTitle()}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {m.talentUnlock_confirmBody()}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={busy === 'unlock'}>
                {m.dangerZone_cancelLabel()}
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={busy === 'unlock'}
                onClick={(event) => {
                  event.preventDefault();
                  void (async () => {
                    await onUnlock();
                    setConfirmOpen(false);
                  })();
                }}
              >
                {busy === 'unlock'
                  ? m.talentUnlock_unlockingLabel()
                  : m.talentUnlock_confirmAction()}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <TalentProfileSilhouette profile={profile} />
      </PageContent>
    </Page>
  );
}
