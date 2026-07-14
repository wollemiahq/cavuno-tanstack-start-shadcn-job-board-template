import { createFileRoute, getRouteApi, notFound, redirect } from "@tanstack/react-router";

import { isNotFound } from "@cavuno/board";
import { boardCopy } from "#/copy";
import { createBreadcrumbJsonLd, crossAxisSalaryJsonLd, formatRange } from "@cavuno/board/seo";

import { JsonLd } from "@/components/json-ld";
import { PageSection } from "@/components/layout/page";
import {
  SalaryEmptyState,
  OverallSalaryCard,
  SalaryRail,
  SenioritySalaryTable,
  type RailItem,
} from "@/components/board/salary-sections";
import {
  toOverallSalaryVM,
  toSalaryBreadcrumbVM,
  toSalaryRailVM,
  toSeniorityTableVM,
} from "@/board/salary-view-model";
import { m } from "../paraglide/messages";
import { getSeoBase, getSkillLocationSalary } from "../server/queries";
import { SalaryNotFoundPage, SalaryPageLayout, SalaryPendingPage } from "./-salary-page-layout";

export const Route = createFileRoute("/salaries/skills/$slug/$locationSlug")({
  staticData: { fullBleed: true, ownsMain: true },
  loader: async ({ params }) => {
    let salary;
    try {
      salary = await getSkillLocationSalary({
        data: { slug: params.slug, locationSlug: params.locationSlug },
      });
    } catch (error) {
      if (isNotFound(error)) throw notFound();
      throw error;
    }
    if (
      salary.skillCanonicalSlug !== params.slug ||
      salary.locationCanonicalSlug !== params.locationSlug
    ) {
      throw redirect({
        to: "/salaries/skills/$slug/$locationSlug",
        params: {
          slug: salary.skillCanonicalSlug,
          locationSlug: salary.locationCanonicalSlug,
        },
        statusCode: 308,
      });
    }
    const seo = await getSeoBase();
    return { salary, seo };
  },
  head: ({ loaderData }) =>
    loaderData
      ? {
          meta: [
            {
              title: m.salaryDetail_skillInPlaceMetaTitle({
                skill: loaderData.salary.skillName,
                place: loaderData.salary.placeName,
                boardName: loaderData.seo.boardName,
              }),
            },
            {
              name: "description",
              content: loaderData.salary.overallSalary
                ? m.salaryDetail_skillInPlaceMetaDescriptionWithData({
                    skill: loaderData.salary.skillName,
                    place: loaderData.salary.placeName,
                    range: formatRange(
                      loaderData.seo.language,
                      loaderData.salary.overallSalary.avgMin,
                      loaderData.salary.overallSalary.avgMax,
                    ),
                    jobCount: loaderData.salary.overallSalary.jobCount,
                  })
                : m.salaryDetail_skillInPlaceMetaDescriptionEmpty({
                    skill: loaderData.salary.skillName,
                    place: loaderData.salary.placeName,
                  }),
            },
          ],
          links: [
            {
              rel: "canonical",
              href: `${loaderData.seo.origin}/salaries/skills/${loaderData.salary.skillCanonicalSlug}/${loaderData.salary.locationCanonicalSlug}`,
            },
          ],
        }
      : {},
  component: SkillLocationSalaryPage,
  pendingComponent: SalaryPendingPage,
  notFoundComponent: () => <SalaryNotFoundPage title={m.salaryDetail_notFoundSkillAndPlace()} />,
});

const rootApi = getRouteApi("__root__");

function SkillLocationSalaryPage() {
  const { salary, seo } = Route.useLoaderData();
  const crumbs = boardCopy(seo.language, seo.labels).breadcrumbs;
  const { board } = rootApi.useLoaderData();
  const c = salary.currency;
  const locale = seo.language;
  const sk = salary.skillCanonicalSlug;

  const jsonLd = [
    crossAxisSalaryJsonLd(locale, {
      name: salary.skillName,
      placeName: salary.placeName,
      countryCode: salary.countryCode,
      overall: salary.overallSalary,
      bySeniority: salary.bySeniority,
      currency: c,
    }),
    createBreadcrumbJsonLd([
      { label: crumbs.home, href: seo.origin },
      { label: crumbs.salaries, href: `${seo.origin}/salaries` },
      { label: crumbs.skills, href: `${seo.origin}/salaries/skills` },
      { label: salary.skillName, href: `${seo.origin}/salaries/skills/${sk}` },
      { label: salary.placeName },
    ]),
  ].filter((e): e is Record<string, unknown> => e !== null);

  const toPlaceRail = (rows: typeof salary.childLocations): RailItem[] =>
    rows.map((x) => ({
      name: x.placeName,
      href: `/salaries/skills/${sk}/${x.placeSlug}`,
      range: formatRange(locale, x.avgSalaryMin, x.avgSalaryMax),
      jobCount: x.jobCount,
    }));

  const skillItems: RailItem[] = salary.topSkills.map((x) => ({
    name: x.skillName,
    href: `/salaries/skills/${x.skillSlug}`,
    range: formatRange(locale, x.avgSalaryMin, x.avgSalaryMax),
    jobCount: x.jobCount,
  }));
  const titleItems: RailItem[] = salary.topTitles.map((x) => ({
    name: x.categoryName,
    href: `/salaries/titles/${x.categorySlug}`,
    range: formatRange(locale, x.avgSalaryMin, x.avgSalaryMax),
    jobCount: x.jobCount,
  }));
  const hasSalaryContent = Boolean(
    salary.overallSalary ||
    salary.bySeniority.length ||
    salary.childLocations.length ||
    salary.otherLocations.length ||
    skillItems.length ||
    titleItems.length,
  );
  const heading = m.salaryDetail_skillInPlaceHeading({
    skill: salary.skillName,
    place: salary.placeName,
  });

  return (
    <SalaryPageLayout
      breadcrumb={toSalaryBreadcrumbVM(
        [
          { name: crumbs.home, href: "/" },
          { name: crumbs.salaries, href: "/salaries" },
          { name: crumbs.skills, href: "/salaries/skills" },
          { name: salary.skillName, href: `/salaries/skills/${sk}` },
          { name: salary.placeName },
        ],
        seo.language,
        seo.labels,
      )}
      title={heading}
    >
      <JsonLd data={jsonLd} />
      {hasSalaryContent ? (
        <>
          {salary.overallSalary ? (
            <OverallSalaryCard
              vm={toOverallSalaryVM(
                {
                  avgMin: salary.overallSalary.avgMin,
                  avgMax: salary.overallSalary.avgMax,
                  jobCount: salary.overallSalary.jobCount,
                  p25Min: salary.overallSalary.p25Min ?? undefined,
                  p75Max: salary.overallSalary.p75Max ?? undefined,
                },
                board.language,
                seo.labels,
              )}
            />
          ) : null}

          {salary.bySeniority.length > 0 ? (
            <PageSection title={m.salaryDetail_seniorityHeading()}>
              <SenioritySalaryTable
                vm={toSeniorityTableVM(
                  salary.bySeniority.map((r) => ({
                    ...r,
                    boardAvgMin: null,
                    boardAvgMax: null,
                    diffPercent: null,
                  })),
                  board.language,
                  seo.labels,
                )}
              />
            </PageSection>
          ) : null}

          <SalaryRail
            vm={toSalaryRailVM(
              m.salaryDetail_citiesLabel(),
              toPlaceRail(salary.childLocations),
              seo.language,
              seo.labels,
            )}
          />
          <SalaryRail
            vm={toSalaryRailVM(
              m.salaryDetail_otherLocations(),
              toPlaceRail(salary.otherLocations),
              seo.language,
              seo.labels,
            )}
          />
          <SalaryRail
            vm={toSalaryRailVM(m.salaryDetail_topSkills(), skillItems, seo.language, seo.labels)}
          />
          <SalaryRail
            vm={toSalaryRailVM(
              m.salaryDetail_relatedTitles(),
              titleItems,
              seo.language,
              seo.labels,
            )}
          />
        </>
      ) : (
        <SalaryEmptyState title={heading} description={m.salaryHub_emptyDescription()} />
      )}
    </SalaryPageLayout>
  );
}
