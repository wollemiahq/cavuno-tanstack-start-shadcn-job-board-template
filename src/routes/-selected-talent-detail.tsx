import { m } from '../paraglide/messages';

import type { SelectedTalentState } from './-use-selected-talent';
import { getTalentSearchLabels } from '@/board/talent-search-labels';
import { toTalentProfileVM } from '@/board/talent-view-model';
import { TalentSearchDetailState } from '@/components/board/talent-search-detail-state';
import { TalentSearchResultDetail } from '@/components/board/talent-search-result-detail';

export function SelectedTalentDetail({
  state,
  locale,
}: {
  state: SelectedTalentState;
  locale: string;
}) {
  const detail = state.profile ? (
    <TalentSearchResultDetail
      vm={toTalentProfileVM(state.profile, locale, getTalentSearchLabels())}
      interactive={state.status === 'ready'}
    />
  ) : undefined;

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
