import { getCompanySearchLabels } from "@/board/company-search-labels";
import { toCompanyDetailVM } from "@/board/company-view-model";
import { CompanySearchDetailState } from "@/components/board/company-search-detail-state";
import { CompanySearchResultDetail } from "@/components/board/company-search-result-detail";
import { m } from "../paraglide/messages";

import type { SelectedCompanyState } from "./-use-selected-company";

export function SelectedCompanyDetail({
  state,
}: {
  state: SelectedCompanyState;
}) {
  const detail = state.company ? (
    <CompanySearchResultDetail
      vm={toCompanyDetailVM(state.company, getCompanySearchLabels())}
      interactive={state.status === "ready"}
    />
  ) : undefined;

  return (
    <CompanySearchDetailState
      status={state.status}
      detail={detail}
      loadingLabel={m.companySearch_detailLoadingLabel()}
      errorTitle={m.companySearch_detailErrorTitle()}
      retryLabel={m.companySearch_retryLabel()}
      onRetry={state.retry}
    />
  );
}
