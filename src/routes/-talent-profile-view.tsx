import { getTalentSearchLabels } from '@/board/talent-search-labels';
import {
  resolveTalentDetailCta,
  toTalentProfileVM,
  type TalentDetailViewer,
} from '@/board/talent-view-model';
import {
  TalentMessageAction,
  type StartTalentConversation,
} from '@/components/board/talent-message-action';
import {
  TalentProfileContent,
  TalentProfileIdentity,
} from '@/components/board/talent-profile-content';
import { Container } from '@/components/layout/container';
import { PageLayout } from '@/components/layout/page-layout';
import { DitherCanvas } from '@/components/marketing/dither-canvas';
import type { RootSessionValue } from '@/components/root-session';
import { candidateSignInHref } from '@/lib/candidate-return-to';
import { m } from '@/paraglide/messages';
import { getLocale } from '@/paraglide/runtime';
import { getTalentProfilePage } from '@/server/talent-pages';

const PRICING_HREF = '/employers';

export function TalentProfilePageView({
  profile,
  user,
  hasTalentAccess = false,
  canStartMessage,
  messagingEnabled,
  locationHref,
  onStartConversation,
  onConversationStarted,
}: {
  profile: Awaited<ReturnType<typeof getTalentProfilePage>>['profile'];
  user: Pick<NonNullable<RootSessionValue['user']>, 'role'> | null;
  hasTalentAccess?: boolean;
  canStartMessage?: boolean;
  messagingEnabled: boolean;
  locationHref: string;
  onStartConversation: StartTalentConversation;
  onConversationStarted: (conversationId: string) => void;
}) {
  const vm = toTalentProfileVM(profile, getLocale(), getTalentSearchLabels());
  const viewer: TalentDetailViewer =
    user === null
      ? { kind: 'anonymous' }
      : user.role === 'employer'
        ? {
            kind: 'employer',
            hasTalentAccess,
            canStartMessage: canStartMessage ?? hasTalentAccess,
          }
        : { kind: 'candidate' };
  const cta = resolveTalentDetailCta({
    viewer,
    candidateHandle: vm.handle,
    detailHref: vm.detailHref,
    signInHref: candidateSignInHref(locationHref),
    pricingHref: PRICING_HREF,
    labels: {
      message: m.talentSearch_messageLabel(),
      viewProfile: vm.viewProfileLabel,
      upgrade: m.talentSearch_upgradeToMessageLabel(),
    },
    showViewProfile: false,
    messagingEnabled,
  });
  return (
    <PageLayout
      band={
        <div className="border-border bg-secondary relative isolate overflow-hidden border-b">
          <DitherCanvas className="pointer-events-none absolute inset-0 -z-10 h-full w-full" />
          <Container width="wide">
            <div className="flex flex-col pt-(--header-space) pb-8 md:pb-10">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <TalentProfileIdentity vm={vm} headingAs="h1" size="xl" />
                {cta.message ? (
                  <div
                    data-slot="talent-profile-actions"
                    className="flex shrink-0 flex-wrap items-center gap-2"
                  >
                    <TalentMessageAction
                      action={cta.message}
                      candidateName={vm.displayName}
                      onStartConversation={onStartConversation}
                      onConversationStarted={onConversationStarted}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </Container>
        </div>
      }
    >
      <article className="min-w-0">
        <TalentProfileContent vm={vm} headingAs="h1" showHeader={false} />
      </article>
    </PageLayout>
  );
}
