import type { ReactNode } from 'react';

import { m } from '../paraglide/messages';

import type { SelectedTalentState } from './-use-selected-talent';
import { getTalentSearchLabels } from '@/board/talent-search-labels';
import {
  resolveTalentDetailCta,
  toTalentProfileVM,
  type TalentDetailViewer,
} from '@/board/talent-view-model';
import type { StartTalentConversation } from '@/components/board/talent-message-action';
import { TalentSearchDetailState } from '@/components/board/talent-search-detail-state';
import { TalentSearchResultDetail } from '@/components/board/talent-search-result-detail';

/** The board's employer pricing / talent-plan offer surface. */
const PRICING_HREF = '/employers';

export function SelectedTalentDetail({
  state,
  locale,
  viewer,
  signInHref,
  messagingEnabled,
  profileUnlocks = false,
  saveSlot,
  onStartConversation,
  onConversationStarted,
}: {
  state: SelectedTalentState;
  locale: string;
  /** The signed-in viewer's role, for gating the Message CTA. */
  viewer: TalentDetailViewer;
  /** Where an anonymous viewer's Message CTA sends them to authenticate. */
  signInHref: string;
  /** Board `features.messaging`: `false` hides the Message CTA entirely. */
  messagingEnabled: boolean;
  /** Directory cards link to `/p/{id}` when the board sells profile unlocks. */
  profileUnlocks?: boolean;
  /** Employer Save, next to Message. Bound list is one-click; else pick a job. */
  saveSlot?: ReactNode;
  onStartConversation: StartTalentConversation;
  onConversationStarted: (conversationId: string) => void;
}) {
  const detail = state.profile
    ? (() => {
        const vm = toTalentProfileVM(
          state.profile,
          locale,
          getTalentSearchLabels(),
          {
            profileUnlocks,
          },
        );
        const cta = resolveTalentDetailCta({
          viewer,
          candidateHandle: vm.handle,
          detailHref: vm.detailHref,
          signInHref,
          pricingHref: PRICING_HREF,
          labels: {
            message: m.talentSearch_messageLabel(),
            viewProfile: vm.viewProfileLabel,
            upgrade: m.talentSearch_upgradeToMessageLabel(),
          },
          // The candidate's NAME is the link to their canonical profile (both
          // the expanded identity and the condensed header), so the pane no
          // longer renders a separate "View profile" button.
          showViewProfile: false,
          messagingEnabled,
        });
        return (
          <TalentSearchResultDetail
            vm={vm}
            cta={cta}
            interactive={state.status === 'ready'}
            saveSlot={state.status === 'ready' ? saveSlot : undefined}
            onStartConversation={onStartConversation}
            onConversationStarted={onConversationStarted}
          />
        );
      })()
    : undefined;

  return (
    <TalentSearchDetailState
      status={state.status}
      detail={detail}
      loadingLabel={m.talentSearch_detailLoadingLabel()}
      errorTitle={m.talentSearch_detailErrorTitle()}
      retryLabel={m.talentSearch_retryLabel()}
      onRetry={state.retry}
    />
  );
}
