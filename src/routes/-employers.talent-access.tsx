/**
 * Employer talent-access checkout on `/employers`. Mirrors the candidate
 * paywall state machine in `-access-page.tsx`: pick a plan, mount connected
 * -account embedded checkout, poll the grant until `hasTalentAccess`, then
 * invalidate. Out-of-credits plan changes call `upgrade`, never a second
 * checkout. Billing management is the company portal.
 */
import { useCallback, useEffect, useState, type ReactNode } from 'react';

import { Link } from '@tanstack/react-router';
import { Clock } from 'lucide-react';

import { EmbeddedCheckout } from '../components/paywall/embedded-checkout';
import { m } from '../paraglide/messages';
import {
  EmployersPageView,
  type EmployersPageViewDependencies,
} from './-employers.index';

import { EmptyState } from '@/components/empty-state';
import { Page, PageContent, PageHeader } from '@/components/layout/page';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Spinner } from '@/components/ui/spinner';
import { boardErrorMessage } from '@/lib/board-error-message';
import type { TalentAccessGrant } from '@/server/talent-access';
import type { TalentAccessResult } from '@/server/talent-access';
import type {
  CompanyBillingPortalSession,
  Plan,
  TalentAccessCheckoutSession,
  TalentAccessUpgrade,
} from '@cavuno/board';

export const EMPLOYERS_RETURN_PATH = '/employers';

export type EmployersTalentViewer =
  | { kind: 'anonymous' }
  | { kind: 'other' }
  | {
      kind: 'employer';
      hasTalentAccess: boolean;
      companyId: string | null;
      companySlug: string | null;
    };

export function EmployersTalentAccessView({
  plans,
  contactPlans,
  seo,
  sessionId,
  viewer,
  pageDependencies,
  getTalentAccessGrantAction,
  startCheckoutAction,
  upgradeAction,
  openBillingPortalAction,
  invalidate,
  reportActionError,
}: {
  plans: Plan[];
  contactPlans: Plan[];
  seo: { boardName: string };
  sessionId?: string;
  viewer: EmployersTalentViewer;
  pageDependencies?: EmployersPageViewDependencies;
  getTalentAccessGrantAction: () => Promise<TalentAccessGrant>;
  startCheckoutAction: (input: {
    data: { planId: string; returnPath: string; companyId?: string };
  }) => Promise<TalentAccessResult<TalentAccessCheckoutSession>>;
  upgradeAction: (input: {
    data: { planId: string; companyId?: string };
  }) => Promise<TalentAccessResult<TalentAccessUpgrade>>;
  openBillingPortalAction: (input: {
    data: { companySlug: string; returnPath?: string };
  }) => Promise<TalentAccessResult<CompanyBillingPortalSession>>;
  invalidate: () => Promise<void>;
  reportActionError: (message?: string) => void;
}) {
  const [kit, setKit] = useState<TalentAccessCheckoutSession | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [exhausted, setExhausted] = useState(false);
  const [polling, setPolling] = useState(Boolean(sessionId));

  const hasTalentAccess =
    (viewer.kind === 'employer' && viewer.hasTalentAccess) || confirmed;
  const companyId = viewer.kind === 'employer' ? viewer.companyId : null;
  const companySlug = viewer.kind === 'employer' ? viewer.companySlug : null;

  useEffect(() => {
    if (!polling || hasTalentAccess) return;
    let stop = false;
    let attempts = 0;
    let timerId: number;
    const tick = async () => {
      attempts += 1;
      let next;
      try {
        next = await getTalentAccessGrantAction();
      } catch {
        if (stop) return;
        setPolling(false);
        setExhausted(true);
        reportActionError();
        return;
      }
      if (stop) return;
      if (next.hasTalentAccess) {
        setConfirmed(true);
        setPolling(false);
        void invalidate().catch(() => reportActionError());
      } else if (attempts < 30) {
        timerId = window.setTimeout(tick, 2000);
      } else {
        setPolling(false);
        setExhausted(true);
      }
    };
    timerId = window.setTimeout(tick, 2000);
    return () => {
      stop = true;
      window.clearTimeout(timerId);
    };
  }, [
    getTalentAccessGrantAction,
    hasTalentAccess,
    invalidate,
    polling,
    reportActionError,
  ]);

  const handleCheckoutComplete = useCallback(() => {
    setPolling(true);
  }, []);

  async function subscribe(planId: string) {
    setBusy(planId);
    try {
      const result = await startCheckoutAction({
        data: {
          planId,
          returnPath: EMPLOYERS_RETURN_PATH,
          companyId: companyId ?? undefined,
        },
      });
      if (result.ok) setKit(result.data);
      else reportActionError(boardErrorMessage(result));
    } catch {
      reportActionError();
    } finally {
      setBusy(null);
    }
  }

  async function upgrade(planId: string) {
    setBusy(planId);
    try {
      const result = await upgradeAction({
        data: { planId, companyId: companyId ?? undefined },
      });
      // `already_on_plan` is the company asking for the plan it holds: nothing
      // changed, so re-reading is the honest response, not an error toast.
      if (result.ok || result.code === 'already_on_plan') await invalidate();
      else reportActionError(boardErrorMessage(result));
    } catch {
      reportActionError();
    } finally {
      setBusy(null);
    }
  }

  async function manage() {
    if (!companySlug) return;
    setBusy('portal');
    try {
      const result = await openBillingPortalAction({
        data: {
          companySlug,
          returnPath: EMPLOYERS_RETURN_PATH,
        },
      });
      if (result.ok) window.location.href = result.data.url;
      else reportActionError(boardErrorMessage(result));
    } catch {
      reportActionError();
    } finally {
      setBusy(null);
    }
  }

  if (kit) {
    return (
      <Page width="wide">
        <PageContent
          header={
            <PageHeader
              title={m.employerLanding_completePurchaseTitle()}
              description={m.employerLanding_completePurchaseSubtitle()}
              actions={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setKit(null)}
                >
                  {m.employerLanding_backToPlansLabel()}
                </Button>
              }
            />
          }
        >
          <EmbeddedCheckout kit={kit} onComplete={handleCheckoutComplete} />
        </PageContent>
      </Page>
    );
  }

  if (polling && !hasTalentAccess) {
    return (
      <Page width="content">
        <PageContent header={<PageHeader title={m.employerLanding_title()} />}>
          <Empty className="min-h-80 border-0">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Spinner className="size-5" />
              </EmptyMedia>
              <EmptyTitle>{m.employerLanding_confirmingText()}</EmptyTitle>
              <EmptyDescription>
                {m.employerLanding_confirmingSubtitle()}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </PageContent>
      </Page>
    );
  }

  if (exhausted && !hasTalentAccess) {
    return (
      <Page width="content">
        <PageContent>
          <EmptyState
            icon={<Clock aria-hidden="true" />}
            title={m.employerLanding_paymentReceivedTitle()}
            description={m.employerLanding_paymentReceivedBody()}
            action={
              <Button
                onClick={async () => {
                  try {
                    await invalidate();
                  } catch {
                    reportActionError();
                  }
                }}
              >
                {m.employerLanding_refreshLabel()}
              </Button>
            }
          />
        </PageContent>
      </Page>
    );
  }

  const canCheckout = viewer.kind === 'employer' && !hasTalentAccess;
  const canUpgrade = viewer.kind === 'employer' && hasTalentAccess;

  const talentPlanAction = ({
    planId,
    className,
    children,
  }: {
    planId: string;
    className: string;
    children: ReactNode;
  }) => {
    if (canCheckout) {
      return (
        <button
          type="button"
          className={className}
          disabled={busy !== null}
          onClick={() => void subscribe(planId)}
        >
          {busy === planId ? m.employerLanding_startingLabel() : children}
        </button>
      );
    }
    if (canUpgrade) {
      return (
        <button
          type="button"
          className={className}
          disabled={busy !== null}
          onClick={() => void upgrade(planId)}
        >
          {busy === planId
            ? m.employerLanding_startingLabel()
            : m.employerLanding_upgradeLabel()}
        </button>
      );
    }
    return (
      pageDependencies?.joinLink({ className, children }) ?? (
        <Link
          to="/auth/join"
          search={{ returnTo: '/employers' }}
          className={className}
        >
          {children}
        </Link>
      )
    );
  };

  const talentSectionAction =
    canUpgrade && companySlug ? (
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy === 'portal'}
        onClick={() => void manage()}
      >
        {busy === 'portal'
          ? m.employerLanding_openingBillingLabel()
          : m.employerLanding_manageBillingLabel()}
      </Button>
    ) : null;

  return (
    <EmployersPageView
      plans={plans}
      contactPlans={contactPlans}
      seo={seo}
      talentSectionAction={talentSectionAction}
      dependencies={{
        postingPlanLink:
          pageDependencies?.postingPlanLink ??
          (({ planId, className, children }) => (
            <Link to="/post" search={{ plan: planId }} className={className}>
              {children}
            </Link>
          )),
        joinLink:
          pageDependencies?.joinLink ??
          (({ className, children }) => (
            <Link
              to="/auth/join"
              search={{ returnTo: '/employers' }}
              className={className}
            >
              {children}
            </Link>
          )),
        talentPlanAction,
      }}
    />
  );
}
