import { useEffect, useState } from 'react';

import { Link, createFileRoute, getRouteApi, useLocation, useRouter } from '@tanstack/react-router';
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
import { startConversation } from '@/server/messaging';
import { listPlans } from '@/server/queries';
import {
  getTalentCandidateAccess,
  unlockTalentProfile,
  upgradeTalentAccess,
} from '@/server/talent-access';
import type { Plan, TalentCandidateAccess } from '@cavuno/board';

const rootApi = getRouteApi('__root__');

export const Route = createFileRoute('/p/$handle')({
  staticData: { fullBleed: true, ownsMain: true },
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
  const { board } = rootApi.useLoaderData();
  const { user, talentAccess, ready } = useRootSession();
  const location = useLocation();
  const router = useRouter();
  const [candidateAccess, setCandidateAccess] =
    useState<TalentCandidateAccess | null>(null);
  const [candidateAccessReady, setCandidateAccessReady] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const opaque = isOpaqueTalentRoute(routeParam, profile.handle);
  const sellsUnlocks = sellsTalentProfileUnlocks(talentAccess.accessModel);
  const gated = sellsUnlocks || isRedactedTalentProfile(profile);
  const sessionEmployer = ready && user?.role === 'employer';
  const needsCandidateAccess = opaque && gated && sessionEmployer;

  useEffect(() => {
    if (!needsCandidateAccess) {
      setCandidateAccess(null);
      setCandidateAccessReady(true);
      return;
    }
    let cancelled = false;
    setCandidateAccessReady(false);
    void getTalentCandidateAccess({ data: { candidateId: profile.id } })
      .then((access) => {
        if (!cancelled) {
          setCandidateAccess(access);
          setCandidateAccessReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCandidateAccess(null);
          setCandidateAccessReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [needsCandidateAccess, profile.id]);

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

  if (surface === 'pending') {
    return <TalentUnlockPending />;
  }

  if (surface !== 'profile') {
    return (
      <TalentUnlockGate
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
                companyId: talentAccess.companyId ?? undefined,
              },
            });
            // The spend is idempotent, so an already-unlocked reply is a
            // success: re-read and show the full profile.
            if (result.ok) await router.invalidate();
            else toastActionError(boardErrorMessage(result));
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
                companyId: talentAccess.companyId ?? undefined,
              },
            });
            if (result.ok || result.code === 'already_on_plan') {
              await router.invalidate();
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
      profile={profile}
      user={user}
      hasTalentAccess={talentAccess.hasTalentAccess}
      canStartMessage={employerCanStartMessage(talentAccess)}
      messagingEnabled={board.features.messaging}
      locationHref={location.href}
      onStartConversation={(input) => startConversation({ data: input })}
      onConversationStarted={(conversationId) =>
        window.location.assign(
          localizePath(`/messages/${encodeURIComponent(conversationId)}`),
        )
      }
    />
  );
}
