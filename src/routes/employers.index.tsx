import { Text } from "@/components/text"
import { createFileRoute } from "@tanstack/react-router";

import type { Plan, SalesLedPlan } from "@cavuno/board";

import { JsonLd } from "@/components/json-ld";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { cx } from "@/utils/cx";
import { createBreadcrumbJsonLd } from "@cavuno/board/seo";
import { boardCopy } from "#/copy";
import { m } from "../paraglide/messages";
import { getSeoBase, listPlans, listSalesLedPlans } from "../server/queries";

export const Route = createFileRoute("/employers/")({
  loader: async () => {
    const [plans, salesLed, seo] = await Promise.all([
      listPlans({ data: {} }),
      listSalesLedPlans(),
      getSeoBase(),
    ]);
    return { plans: plans.data, salesLed: salesLed.data, seo };
  },
  head: ({ loaderData }) =>
    loaderData
      ? {
          meta: [
            { title: m.employerLanding_title() },
            {
              name: "description",
              content: m.employerLanding_subtitle({
                boardName: loaderData.seo.boardName,
              }),
            },
          ],
          links: [{ rel: "canonical", href: `${loaderData.seo.origin}/employers` }],
        }
      : { meta: [{ title: m.employerLanding_title() }] },
  component: EmployersPage,
});

function formatPrice(price: Plan["price"]): string {
  if (!price) return m.employerLanding_freeLabel();
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: price.currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(price.amountCents / 100);
}

const intervalSuffix = (i: Plan["billingInterval"]) =>
  i === "month"
    ? m.employerLanding_perMonthSuffix()
    : i === "year"
      ? m.employerLanding_perYearSuffix()
      : "";

function PlanCard({ plan }: { plan: Plan }) {
  const features = [
    plan.featureSummary.maxActiveJobs === 1
      ? m.employerLanding_featureActiveJobsOne({
          count: plan.featureSummary.maxActiveJobs,
        })
      : m.employerLanding_featureActiveJobsMany({
          count: plan.featureSummary.maxActiveJobs,
        }),
    m.employerLanding_featureListingDuration({
      days: plan.featureSummary.durationDays,
    }),
    plan.featureSummary.featuredSlots > 0
      ? m.employerLanding_featureFeaturedSlots({
          count: plan.featureSummary.featuredSlots,
        })
      : null,
    plan.talent
      ? m.employerLanding_featureProfileUnlocks({
          count: plan.talent.unlocksPerPeriod,
        })
      : null,
    plan.talent
      ? m.employerLanding_featureMessages({
          count: plan.talent.messagesPerPeriod,
        })
      : null,
  ].filter((f): f is NonNullable<typeof f> => f !== null);

  return (
    <div
      className={cx(
        "rounded-xl bg-primary p-6 shadow-xs ring-1 ring-secondary_alt",
        plan.isRecommended && "ring-2 ring-brand",
      )}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{plan.name}</h3>
          {plan.isRecommended ? (
            <Badge size="sm" type="pill-color" color="brand">
              {m.employerLanding_recommendedBadge()}
            </Badge>
          ) : null}
        </div>
        <p className="text-2xl font-semibold">
          {plan.kind === "free" ? m.employerLanding_freeLabel() : formatPrice(plan.price)}
          {plan.kind !== "free" && plan.price ? (
            <span className="text-sm font-normal text-tertiary">
              {intervalSuffix(plan.billingInterval)}
            </span>
          ) : null}
        </p>
        {plan.description ? (
          <p className="text-sm text-tertiary">{plan.description}</p>
        ) : null}
        <ul className="space-y-1 text-sm">
          {features.map((f) => (
            <li key={f} className="text-tertiary">
              • {f}
            </li>
          ))}
        </ul>
        <Button
          color={plan.isRecommended ? "primary" : "secondary"}
          size="md"
          className="w-full"
          href="/auth/join"
        >
          {plan.invoiceOnly
            ? m.employerLanding_requestInvoiceLabel()
            : m.employerLanding_subscribeLabel()}
        </Button>
      </div>
    </div>
  );
}

function SalesLedCard({ plan }: { plan: SalesLedPlan }) {
  return (
    <div className="rounded-xl bg-primary p-6 shadow-xs ring-1 ring-secondary_alt">
      <div className="space-y-3">
        <h3 className="font-semibold">{plan.name}</h3>
        <p className="text-2xl font-semibold">{plan.priceText}</p>
        {plan.description ? (
          <p className="text-sm text-tertiary">{plan.description}</p>
        ) : null}
        <ul className="space-y-1 text-sm">
          {plan.featuredBullets.map((b) => (
            <li key={b} className="text-tertiary">
              • {b}
            </li>
          ))}
        </ul>
        {/* Sales-led CTA is an operator-supplied URL / mailto: — a plain link. */}
        <Button color="secondary" size="md" className="w-full" href={plan.ctaDestination}>
          {plan.ctaText}
        </Button>
      </div>
    </div>
  );
}

function PlanGroup({ title, plans }: { title: string; plans: Plan[] }) {
  if (plans.length === 0) return null;
  return (
    <section className="space-y-3">
      <Text as="h2" variant="heading4">{title}</Text>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} />
        ))}
      </div>
    </section>
  );
}

function EmployersPage() {
  const { plans, salesLed, seo } = Route.useLoaderData();
  const crumbs = boardCopy(seo.language, seo.labels).breadcrumbs;

  const jobPosting = plans.filter((p) => p.purpose === "job_posting");
  const talentAccess = plans.filter((p) => p.purpose === "talent_access");

  const jsonLd = [
    createBreadcrumbJsonLd([
      { label: crumbs.home, href: seo.origin },
      { label: m.breadcrumbJsonLd_forEmployersLabel() },
    ]),
  ].filter((e): e is Record<string, unknown> => e !== null);

  const empty = jobPosting.length === 0 && talentAccess.length === 0 && salesLed.length === 0;

  return (
    <div className="space-y-8">
      <JsonLd data={jsonLd} />
      <header>
        <Text as="h1" variant="heading1">{m.employerLanding_title()}</Text>
        <p className="text-tertiary">
          {m.employerLanding_subtitle({ boardName: seo.boardName })}
        </p>
      </header>

      {empty ? (
        <p className="rounded-lg border border-dashed border-secondary p-10 text-center text-tertiary">
          {m.employerLanding_noPlansText()}
        </p>
      ) : (
        <>
          <PlanGroup title={m.employerLanding_jobPostingHeading()} plans={jobPosting} />
          <PlanGroup title={m.employerLanding_talentAccessHeading()} plans={talentAccess} />
          {salesLed.length > 0 ? (
            <section className="space-y-3">
              <Text as="h2" variant="heading4">{m.employerLanding_enterpriseHeading()}</Text>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {salesLed.map((plan) => (
                  <SalesLedCard key={plan.id} plan={plan} />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
