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

/**
 * Meta description for a company salary overview.
 *
 * Composed from whole sentences rather than one fixed template, for two
 * reasons. Search engines rewrite the description most of the time
 * (Ahrefs measured 63%, Portent 68–71%), so its real job is to be the best
 * self-contained answer available for the query — answer engines lift
 * complete sentences, not teaser fragments. And the sentence set has to
 * degrade: a company with one posting and no category breakdown must not
 * emit "across 0 job categories".
 *
 * The lead sentence mirrors the hosted board's phrasing so the migration
 * doctor's description delta on this page class narrows to the freshness
 * marker rather than a full rewrite.
 *
 * `year` is the render year. These aggregates are recomputed from live
 * postings, so it is a truthful freshness signal rather than a stamped
 * publish date; every comparable page in the category carries one.
 */
export function salaryCompanyMetaDescriptionFrame(args: {
  company: string;
  range: string | null;
  jobCount: number | null;
  categoryCount: number;
  year: number;
}): string {
  const { company, range, jobCount, categoryCount, year } = args;
  if (range === null || jobCount === null) {
    return m.companySalaries_metaDescriptionEmpty({ company });
  }
  const sentences = [
    m.companySalaries_metaDescriptionWithData({ company, range, jobCount }),
  ];
  if (categoryCount > 0) {
    sentences.push(
      m.companySalaries_metaDescriptionCategories({ categoryCount }),
    );
  }
  sentences.push(m.companySalaries_metaDescriptionUpdated({ year }));
  return sentences.join(' ');
}
