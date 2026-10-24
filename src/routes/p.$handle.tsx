import { lazy, Suspense, useEffect, useState } from 'react';

import {
  Link,
  createFileRoute,
  getRouteApi,
  useLocation,
  useRouter,
} from '@tanstack/react-router';
import { UserRoundX } from 'lucide-react';

import { m } from '../paraglide/messages';
import { createTalentProfileLoader } from './-talent-loaders';
import { TalentProfilePageView } from './-talent-profile-view';
import { TalentUnlockGate, TalentUnlockPending } from './-talent-unlock-gate';

import {
  employerCanStartMessage,
  isOpaqueTalentRoute,
  isRedactedTalentProfile,
  resolveTalentProfileSurface,
  sellsTalentProfileUnlocks,
} from '@/board/talent-view-model';
import { jsonLdHeadScripts } from '@/components/json-ld';
import { Page, PageContent, PageHeader } from '@/components/layout/page';
import { useRootSession } from '@/components/root-session';
import { buttonVariants } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { toastActionError } from '@/lib/action-toast';
import { boardErrorMessage } from '@/lib/board-error-message';
import { localizePath } from '@/lib/localized-path';
import { searchString, type UrlSearchInput } from '@/lib/pagination';
import { startConversation } from '@/server/messaging';
import { listPlans } from '@/server/queries';
import {
  getTalentCandidateAccess,
  getTalentAccessGrant,
  unlockTalentProfile,
  upgradeTalentAccess,
} from '@/server/talent-access';
import type { Plan, TalentCandidateAccess, TalentAccess } from '@cavuno/board';

const rootApi = getRouteApi('__root__');
// Company selection is employer-only; public profiles do not need its controls.
const EmployerCompanySelect = lazy(() =>
  import('@/components/board/employer-company-select').then((module) => ({
    default: module.EmployerCompanySelect,
  })),
);

type CandidateCompanyAccess = {
  candidateId: string;
  companyId?: string;
  access: TalentCandidateAccess | null;
  grant: TalentAccess | null;
};

async function readCandidateCompanyAccess(
  candidateId: string,
  companyId?: string,
) {
  // Without an explicit company the root session's grant already applies.
  const [access, grant] = await Promise.all([
    getTalentCandidateAccess({ data: { candidateId, companyId } }),
    companyId ? getTalentAccessGrant({ data: { companyId } }) : null,
  ]);
  return { candidateId, companyId, access, grant };
}

/**
 * Route-contract role: this is the candidate profile page. Keep this marker
 * on the profile route if it moves, and build its links through
 * `@/lib/talent-profile-path`.
 */
export const cavunoPage = 'talentProfile';

export const Route = createFileRoute('/p/$handle')({
  staticData: { fullBleed: true, ownsMain: true },
  validateSearch: (search: UrlSearchInput): { companyId?: string } => {
    const companyId = searchString(search.companyId);
    return companyId ? { companyId } : {};
  },
  loaderDeps: ({ search }): { companyId?: string } =>
    search.companyId ? { companyId: search.companyId } : {},
  loader: createTalentProfileLoader(),
  head: ({ loaderData }) =>
    loaderData
      ? { ...loaderData.head, scripts: jsonLdHeadScripts(loaderData.jsonLd) }
      : {},
  component: TalentProfilePage,
  notFoundComponent: TalentProfileNotFound,
});

function TalentProfileNotFound() {
  return (
    <Page width="wide">
      <PageContent
        header={<PageHeader title={m.publicProfile_profileFallbackLabel()} />}
      >
        <Empty className="min-h-80 border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UserRoundX aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>{m.publicProfile_notFoundText()}</EmptyTitle>
            <EmptyDescription>
              {m.talentDirectory_notFoundText()}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link
              to="/talent"
              className={buttonVariants({ variant: 'outline' })}
            >
              {m.talentDirectory_title()}
            </Link>
          </EmptyContent>
        </Empty>
      </PageContent>
    </Page>
  );
}

function TalentProfilePage() {
  const { profile } = Route.useLoaderData();
  const { handle: routeParam } = Route.useParams();
  const { companyId: requestedCompanyId } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { board } = rootApi.useLoaderData();
  const { user, talentAccess, employerCompanies, ready, refreshSession } =
    useRootSession();
  const location = useLocation();
  const router = useRouter();
  const [companyAccess, setCompanyAccess] =
    useState<CandidateCompanyAccess | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const opaque = isOpaqueTalentRoute(routeParam, profile.handle);
  const sellsUnlocks = sellsTalentProfileUnlocks(talentAccess.accessModel);
  const gated = sellsUnlocks || isRedactedTalentProfile(profile);
  const sessionEmployer = ready && user?.role === 'employer';
  const companies = (employerCompanies ?? []).flatMap((membership) =>
    membership.status === 'approved' ? [membership.company] : [],
  );
  const companyId = requestedCompanyId
    ? companies.find((company) => company.id === requestedCompanyId)?.id
    : companies.length === 1
      ? companies[0]!.id
      : undefined;
  // A one-company employer's default context is that company, so only a
  // choice between companies (or an explicit one) needs scoped requests.
  const scoped = companies.length > 1 || Boolean(requestedCompanyId);
  const requestCompanyId = scoped ? companyId : undefined;
  const needsCompanyContext =
    sessionEmployer &&
    scoped &&
    ((opaque && gated) || board.features.messaging);
  const needsCompany =
    needsCompanyContext &&
    (companies.length > 1 || Boolean(requestedCompanyId && !companyId));
  const needsCandidateAccess = scoped
    ? needsCompanyContext && (!needsCompany || Boolean(companyId))
    : sessionEmployer && opaque && gated;
  const currentCompanyAccess =
    companyAccess?.candidateId === profile.id &&
    companyAccess.companyId === requestCompanyId
      ? companyAccess
      : null;
  const candidateAccess = currentCompanyAccess?.access ?? null;
  const scopedGrant = needsCompanyContext
    ? currentCompanyAccess?.grant
    : talentAccess;
  const candidateAccessReady =
    !needsCandidateAccess || currentCompanyAccess !== null;

  const companySelector = needsCompany ? (
    <div className="mb-6 max-w-sm">
      <Suspense fallback={<p role="status">{m.ui_loadingLabel()}</p>}>
        <EmployerCompanySelect
          id="talent-access-company"
          value={companyId}
          companies={companies}
          disabled={busy !== null}
          onChange={(selectedCompanyId) =>
            void navigate({
              search: { companyId: selectedCompanyId },
              resetScroll: false,
            })
          }
        />
      </Suspense>
    </div>
  ) : undefined;

  useEffect(() => {
    if (!needsCandidateAccess) {
      setCompanyAccess(null);
      return;
    }
    let cancelled = false;
    void readCandidateCompanyAccess(profile.id, requestCompanyId)
      .then((state) => {
        if (!cancelled) setCompanyAccess(state);
      })
      .catch(() => {
        if (!cancelled)
          setCompanyAccess({
            candidateId: profile.id,
            companyId: requestCompanyId,
            access: null,
            grant: null,
          });
      });
    return () => {
      cancelled = true;
    };
  }, [needsCandidateAccess, profile.id, requestCompanyId]);

  const surface = resolveTalentProfileSurface({
    routeParam,
    profile,
    sellsUnlocks,
    viewerRole:
      user?.role === 'employer' || user?.role === 'candidate'
        ? user.role
        : null,
    candidateAccess,
    candidateAccessReady: !needsCandidateAccess || candidateAccessReady,
  });

  useEffect(() => {
    if (surface !== 'out_of_unlocks') return;
    let cancelled = false;
    void listPlans({ data: { purpose: 'talent_access' } })
      .then((page) => {
        if (!cancelled) setPlans(page.data);
      })
      .catch(() => {
        if (!cancelled) setPlans([]);
      });
    return () => {
      cancelled = true;
    };
  }, [surface]);

  if (opaque && gated && needsCompany && !companyId) {
    return (
      <Page width="content">
        <PageContent>
          {companySelector}
          <p className="text-muted-foreground">
            {m.talentUnlock_chooseCompanyBody()}
          </p>
        </PageContent>
      </Page>
    );
  }

  if (surface === 'pending') {
    return <TalentUnlockPending companySelector={companySelector} />;
  }

  if (surface !== 'profile') {
    return (
      <TalentUnlockGate
        companyId={companyId}
        companySelector={companySelector}
        surface={surface}
        creditsRemaining={candidateAccess?.unlockCreditsRemaining ?? 0}
        plans={plans}
        profile={profile}
        busy={busy}
        onUnlock={async () => {
          setBusy('unlock');
          try {
            const result = await unlockTalentProfile({
              data: {
                candidateId: profile.id,
                companyId: requestCompanyId,
              },
            });
            // The spend is idempotent, so an already-unlocked reply is a
            // success: re-read and show the full profile.
            if (result.ok) {
              const [access] = await Promise.all([
                readCandidateCompanyAccess(profile.id, requestCompanyId),
                router.invalidate(),
              ]);
              setCompanyAccess(access);
            } else toastActionError(boardErrorMessage(result));
          } catch {
            toastActionError();
          } finally {
            setBusy(null);
          }
        }}
        onUpgrade={async (planId) => {
          setBusy(planId);
          try {
            const result = await upgradeTalentAccess({
              data: {
                planId,
                companyId: requestCompanyId,
              },
            });
            if (result.ok || result.code === 'already_on_plan') {
              const [access] = await Promise.all([
                readCandidateCompanyAccess(profile.id, requestCompanyId),
                refreshSession(),
                router.invalidate(),
              ]);
              setCompanyAccess(access);
            } else {
              toastActionError(boardErrorMessage(result));
            }
          } catch {
            toastActionError();
          } finally {
            setBusy(null);
          }
        }}
      />
    );
  }

  return (
    <TalentProfilePageView
      companySelector={companySelector}
      profile={profile}
      user={user}
      hasTalentAccess={scopedGrant?.hasTalentAccess ?? false}
      canStartMessage={Boolean(
        scopedGrant && employerCanStartMessage(scopedGrant),
      )}
      messagingEnabled={board.features.messaging}
      locationHref={location.href}
      onStartConversation={(input) =>
        startConversation({ data: { ...input, companyId: requestCompanyId } })
      }
      onConversationStarted={(conversationId) =>
        window.location.assign(
          localizePath(`/messages/${encodeURIComponent(conversationId)}`),
        )
      }
    />
  );
}
