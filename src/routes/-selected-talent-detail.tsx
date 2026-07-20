import { m } from '../paraglide/messages';

import type { SelectedTalentState } from './-use-selected-talent';
import { getTalentSearchLabels } from '@/board/talent-search-labels';
import {
  resolveTalentDetailCta,
  toTalentProfileVM,
  type TalentDetailViewer,
} from '@/board/talent-view-model';
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
}: {
  state: SelectedTalentState;
  locale: string;
  /** The signed-in viewer's role, for gating the Message CTA. */
  viewer: TalentDetailViewer;
  /** Where an anonymous viewer's Message CTA sends them to authenticate. */
  signInHref: string;
  /** Board `features.messaging`: `false` hides the Message CTA entirely. */
  messagingEnabled: boolean;
}) {
  const detail = state.profile
    ? (() => {
        const vm = toTalentProfileVM(
          state.profile,
          locale,
          getTalentSearchLabels(),
        );
        const cta = resolveTalentDetailCta({
          viewer,
          detailHref: vm.detailHref,
          signInHref,
          pricingHref: PRICING_HREF,
          labels: {
            message: m.talentSearch_messageLabel(),
            viewProfile: vm.viewProfileLabel,
          },
          // The pane is a preview, not the canonical profile page, so it
          // keeps the secondary "View profile" link.
          showViewProfile: true,
          messagingEnabled,
        });
        return (
          <TalentSearchResultDetail
            vm={vm}
            cta={cta}
            interactive={state.status === 'ready'}
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
