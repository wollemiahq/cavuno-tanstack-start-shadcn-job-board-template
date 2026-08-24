import { m } from '../paraglide/messages';

export function salaryCopy() {
  return {
    basedOnLabel: m.salary_basedOnLabel(),
    boardBaselineLabel: m.salary_boardBaselineLabel(),
    comparisonHeadlineAverage: m.salary_comparisonHeadlineAverage(),
    comparisonPercentile25Label: m.salary_comparisonPercentile25Label(),
    comparisonPercentile75Label: m.salary_comparisonPercentile75Label(),
    faqHeading: m.salary_faqHeading(),
    medianLabel: m.salary_medianLabel(),
    perYearSuffix: m.salary_perYearSuffix(),
    seniorityTableHeaderAvg: m.salary_seniorityTableHeaderAvg(),
    seniorityTableHeaderDiff: m.salary_seniorityTableHeaderDiff(),
    seniorityTableHeaderLevel: m.salary_seniorityTableHeaderLevel(),
  };
}
