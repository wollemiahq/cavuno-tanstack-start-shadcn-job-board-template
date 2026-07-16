import { m } from '../paraglide/messages';

import type { SelectedCompanyState } from './-use-selected-company';
import { getCompanySearchLabels } from '@/board/company-search-labels';
import { toCompanyDetailVM } from '@/board/company-view-model';
import { toJobCardVM } from '@/board/job-view-model';
import { toOverallSalaryVM } from '@/board/salary-view-model';
import { CompanySearchDetailState } from '@/components/board/company-search-detail-state';
import { CompanySearchResultDetail } from '@/components/board/company-search-result-detail';
import type { BoardLabelOverrides } from '@cavuno/board/format';

export function SelectedCompanyDetail({
  state,
  language,
  labels,
}: {
  state: SelectedCompanyState;
  language: string;
  labels?: BoardLabelOverrides;
}) {
  const hasSalaries = Boolean(
    state.salarySummary &&
    (state.salarySummary.overallSalary !== null ||
      state.salarySummary.byCategory.length > 0),
  );
  const categorySalary = state.salarySummary?.byCategory[0];
  const salaryOverall = state.salarySummary?.overallSalary
    ? toOverallSalaryVM(
        {
          avgMin: state.salarySummary.overallSalary.avgMin,
          avgMax: state.salarySummary.overallSalary.avgMax,
          jobCount: state.salarySummary.overallSalary.jobCount,
        },
        language,
        labels,
      )
    : categorySalary
      ? {
          ...toOverallSalaryVM(
            {
              avgMin: categorySalary.avgSalaryMin,
              avgMax: categorySalary.avgSalaryMax,
              jobCount: categorySalary.jobCount,
            },
            language,
            labels,
          ),
          headlineLabel: categorySalary.categoryName,
        }
      : null;
  const detail = state.company ? (
    <CompanySearchResultDetail
      vm={toCompanyDetailVM(state.company, getCompanySearchLabels())}
      jobPreviews={(state.jobs?.data ?? [])
        .slice(0, 4)
        .map((job) => toJobCardVM(job, language, labels))}
      salaryOverall={salaryOverall}
      hasSalaries={hasSalaries}
      interactive={state.status === 'ready'}
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
