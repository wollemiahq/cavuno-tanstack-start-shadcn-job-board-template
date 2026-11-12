/**
 * `/memberships` — the board's membership plans and, for each, the companies
 * that hold one. A membership is public identity, so the roster is part of the
 * page rather than a signed-in view.
 *
 * View only. The loader lives in `-memberships-loader.ts`: TanStack splits the
 * route COMPONENT but keeps loaders in the critical graph, so a route file that
 * imported its loader from here would drag this whole UI graph into the shared
 * shell.
 */
import { useState, type ReactNode } from 'react';

import { useRouter } from '@tanstack/react-router';
import { Clock } from 'lucide-react';

import { EmbeddedCheckout } from '../components/paywall/embedded-checkout';
import { m } from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';

import { planName } from '@/board/plan-labels';
import { CompanyCard } from '@/components/board/company-card';
import {
  MembershipPlanCard,
  membershipsHref,
  useMembershipCheckout,
  type GetMembershipCheckoutState,
  type MembershipsViewer,
  type StartMembershipCheckout,
} from '@/components/board/membership-plans';
import { EmptyState } from '@/components/empty-state';
import { Page, PageContent, PageHeader } from '@/components/layout/page';
import { Text } from '@/components/text';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Spinner } from '@/components/ui/spinner';
import type {
  listMembershipCompanies,
  MembershipRoster,
} from '@/server/membership-pages';
import type { Plan, PublicCompany } from '@cavuno/board';

export {
  membershipsHref,
  type GetMembershipCheckoutState,
  type MembershipsViewer,
  type StartMembershipCheckout,
} from '@/components/board/membership-plans';

/** The "show more members" read, as the view consumes it. */
export type LoadMoreMembers = (input: {
  data: { planId: string; offset: number };
}) => Promise<Awaited<ReturnType<typeof listMembershipCompanies>>>;

function jobCountLabel(count: number): string {
  return m.companyDetail_openJobsCount({
    count,
    countLabel: count.toLocaleString(getLocale()),
  });
}

/**
 * The plan's member roster. `count` from the scoped company read describes the
 * MEMBERS, not the board, so it is honest as the section's count. A plan with
 * no members renders nothing.
 */
function MemberRoster({
  roster,
  loadMore,
}: {
  roster: MembershipRoster;
  loadMore: (offset: number) => Promise<PublicCompany[]>;
}) {
  const [extra, setExtra] = useState<PublicCompany[]>([]);
  const [busy, setBusy] = useState(false);
  const companies = [...roster.companies, ...extra];
  if (companies.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline gap-3">
        <Text as="h3" variant="heading4">
          {m.memberships_membersHeading()}
        </Text>
        <span className="text-muted-foreground text-sm">
          {m.memberships_memberCount({
            count: roster.count,
            countLabel: roster.count.toLocaleString(getLocale()),
          })}
        </span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {companies.map((company) => (
          <CompanyCard
            key={company.id}
            companySlug={company.slug}
            name={company.name}
            logoUrl={company.logoUrl}
            summary={company.summary}
            publishedJobCount={company.publishedJobCount}
            jobCountLabel={jobCountLabel(company.publishedJobCount)}
            membershipPlanName={company.membership?.planName ?? null}
          />
        ))}
      </div>
      {companies.length < roster.count ? (
        <div>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void loadMore(companies.length)
                .then((next) => setExtra((rows) => [...rows, ...next]))
                .finally(() => setBusy(false));
            }}
          >
            {m.memberships_loadMoreLabel()}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function MembershipsPageView({
  plans,
  rosters,
  seo,
  viewer,
  loadMoreMembers,
  startCheckoutAction,
  getCheckoutStateAction,
  invalidate,
  returning = null,
  preferredCompanySlug = null,
  continueTo = null,
}: {
  plans: Plan[];
  rosters: MembershipRoster[];
  seo: { boardName: string };
  viewer: MembershipsViewer;
  loadMoreMembers: LoadMoreMembers;
  startCheckoutAction?: StartMembershipCheckout;
  getCheckoutStateAction?: GetMembershipCheckoutState;
  invalidate?: () => Promise<void>;
  /** Set when Stripe sent the buyer back with a session to confirm. */
  returning?: { sessionId: string; companySlug: string } | null;
  /** The company the buyer came to join for (`?company=`). */
  preferredCompanySlug?: string | null;
  /**
   * Where the buyer was headed when the board asked for a membership — the
   * job form they left. Offered as the next step once the membership is
   * active.
   */
  continueTo?: string | null;
}): ReactNode {
  const router = useRouter();
  const {
    kit,
    busy,
    error,
    polling,
    confirmed,
    paymentState,
    exhausted,
    join,
    handleCheckoutComplete,
    closeCheckout,
    acknowledgePaymentState,
    acknowledgeExhausted,
  } = useMembershipCheckout({
    startCheckoutAction,
    getCheckoutStateAction,
    invalidate,
    returning,
    continueTo,
  });

  if (kit) {
    return (
      <Page width="wide">
        <PageContent
          header={
            <PageHeader
              title={m.employerLanding_completePurchaseTitle()}
              description={m.memberships_completePurchaseSubtitle()}
              actions={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={closeCheckout}
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

  if (polling) {
    return (
      <Page width="content">
        <PageContent header={<PageHeader title={m.memberships_title()} />}>
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

  if (paymentState)
    return (
      <Page width="content">
        <PageContent>
          <EmptyState
            icon={<Clock aria-hidden="true" />}
            title={m.memberships_title()}
            description={
              paymentState === 'processing'
                ? m.checkout_processingText()
                : m.checkout_failedText()
            }
            action={
              <Button onClick={acknowledgePaymentState}>
                {paymentState === 'processing'
                  ? m.appError_retryAction()
                  : m.employerLanding_backToPlansLabel()}
              </Button>
            }
          />
        </PageContent>
      </Page>
    );

  if (exhausted) {
    return (
      <Page width="content">
        <PageContent>
          <EmptyState
            icon={<Clock aria-hidden="true" />}
            title={m.checkout_pendingTitle()}
            description={m.checkout_pendingText()}
            action={
              <Button onClick={acknowledgeExhausted}>
                {m.employerLanding_backToPlansLabel()}
              </Button>
            }
          />
        </PageContent>
      </Page>
    );
  }

  return (
    <Page width="wide">
      <PageContent
        header={
          <PageHeader
            title={m.memberships_title()}
            description={m.memberships_subtitle({ boardName: seo.boardName })}
          />
        }
      >
        {confirmed ? (
          <div className="flex flex-wrap items-center gap-3">
            <p role="status" className="text-foreground text-sm font-medium">
              {m.memberships_confirmedText()}
            </p>
            {continueTo ? (
              <Button
                type="button"
                onClick={() => void router.navigate({ href: continueTo })}
              >
                {m.memberships_continueToPostLabel()}
              </Button>
            ) : null}
          </div>
        ) : null}
        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}
        {plans.map((plan) => {
          const roster = rosters.find((entry) => entry.planId === plan.id);
          return (
            <section
              key={plan.id}
              aria-label={planName(plan)}
              className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]"
            >
              <MembershipPlanCard
                plan={plan}
                viewer={viewer}
                busy={busy === plan.id}
                onJoin={(companySlug) => void join(plan, companySlug)}
                preferredCompanySlug={preferredCompanySlug}
                signInReturnTo={membershipsHref({
                  companySlug: preferredCompanySlug,
                  continueTo,
                })}
              />
              {roster ? (
                <MemberRoster
                  roster={roster}
                  loadMore={async (offset) => {
                    const next = await loadMoreMembers({
                      data: { planId: plan.id, offset },
                    });
                    return next.companies;
                  }}
                />
              ) : null}
            </section>
          );
        })}
      </PageContent>
    </Page>
  );
}
