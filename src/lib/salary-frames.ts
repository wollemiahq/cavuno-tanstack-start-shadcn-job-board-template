/**
 * Salary-page metadata `<title>` sentence frames — formerly the SDK
 * `getSalaryLexicon(language).frames` builders. Whole ICU sentences with
 * named parameters (never fragment-concatenated in code).
 */
import { m } from '../paraglide/messages';

export function salaryEntityTitleFrame(entity: string, range: string): string {
  return m.salaryFrame_entitySalariesTitle({ entity, range });
}

export function salaryEntityInPlaceTitleFrame(
  entity: string,
  place: string,
  range: string,
): string {
  return m.salaryFrame_entitySalariesInPlaceTitle({ entity, place, range });
}

export function salaryPlaceTitleFrame(
  place: string,
  range: string | null,
): string {
  return range
    ? m.salaryFrame_salariesInPlaceTitle({ place, range })
    : m.salaryFrame_salariesInPlaceTitleNoRange({ place });
}

export function salaryCompanyTitleFrame(
  company: string,
  range: string | null,
): string {
  return range
    ? m.salaryFrame_companySalariesTitle({ company, range })
    : m.salaryFrame_companySalariesTitleNoRange({ company });
}

export function salaryCompanyCategoryTitleFrame(
  company: string,
  category: string,
  range: string | null,
): string {
  return range
    ? m.salaryFrame_companyCategorySalariesTitle({ company, category, range })
    : m.salaryFrame_companyCategorySalariesTitleNoRange({
        company,
        category,
      });
}
