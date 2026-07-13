"use client";

import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "@untitledui/icons";

import type { PublicBlogPostSummary, PublicJobCard, TalentDirectoryEntry } from "@cavuno/board";
import type { BoardLabelOverrides } from "@cavuno/board/format";
import { boardCopy } from "#/copy";

import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { CompanyCard } from "@/components/board/company-card";
import { JobList } from "@/components/board/job-list";
import { JobsSearchControls } from "@/components/board/jobs-search-controls";
import { ListingPageHeader } from "@/components/board/listing-page-header";
import { PageBody } from "@/components/board/page-body";
import { PostCard } from "@/components/post-card";
import { TalentCard } from "@/components/talent-card";
import { LocationCombobox } from "@/components/location-combobox";
import { Text } from "@/components/text";
import { cx } from "@/utils/cx";
import { m } from "../../paraglide/messages";
/**
 * The home `/` LANDING (CAV-515) — a designed job-board front page that opens
 * with the SAME shared listing hero as /jobs, /companies, /blog (the
 * `ListingPageHeader` band: honest job-count eyebrow → display title →
 * subtitle → the shared search that hands off to /jobs), then previews the
 * board's collections as section-heading rows of the shared cards — latest
 * jobs, companies, blog, talent — each honestly feature/data gated, and
 * closes with a dual-path sign-up band (candidate / employer).
 *
 * Dumb, typed-props: every datum arrives from the route loader. A section
 * whose feature is off (blog/talent) or whose collection is empty
 * (companies/blog/talent) is OMITTED WHOLE — a board shows no empty rail. The
 * CTA band mirrors `resolveSignupDestination`'s flag logic: each role card
 * renders only when its role is enabled, pointing DIRECTLY at that role's
 * sign-up form; with neither role the band does not render.
 */

const MAX_LANDING_JOBS = 8;
const MAX_LANDING_COMPANIES = 6;
const MAX_LANDING_POSTS = 3;
const MAX_LANDING_TALENT = 6;

/** The slim company shape the strip needs — a subset of the list wire card. */
export interface HomeCompanyCard {
    id: string;
    slug: string;
    name: string;
    logoUrl: string | null;
    description: string | null;
    publishedJobCount: number;
}

/** Pre-resolve the pluralized "N open job(s)" label (mirrors companies.index). */
function jobCountLabel(count: number) {
    return count === 1
        ? m.companyDetail_openJobsCountOne({ count })
        : m.companyDetail_openJobsCountMany({ count });
}

/**
 * The hero search — the SAME `JobsSearchControls` /jobs renders, wired to hand
 * the query off to /jobs (any edit navigates there with the next filter set,
 * exactly as /jobs' own onChange does), so the home hero is byte-identical to
 * the listing hero.
 */
function HomeHeroSearch({ language, labels }: { language: string; labels?: BoardLabelOverrides }) {
    const navigate = useNavigate();
    return (
        <JobsSearchControls
            filters={{}}
            language={language}
            labels={labels}
            onChange={(next) => navigate({ to: "/jobs", search: () => ({ ...next }) })}
            locationSlot={
                <LocationCombobox
                    onSelect={({ slug }) =>
                        navigate({ to: "/jobs/locations/$location", params: { location: slug } })
                    }
                    onClear={() => {}}
                />
            }
        />
    );
}

/** A section header row: a display sub-heading with a trailing "view all" link. */
function SectionHeader({
    title,
    viewAllLabel,
    to,
}: {
    title: string;
    viewAllLabel: string;
    to: "/jobs" | "/companies" | "/blog" | "/talent";
}) {
    return (
        <div className="flex items-end justify-between gap-4">
            <Text as="h2" variant="heading2" className="md:text-display-sm">
                {title}
            </Text>
            <Link
                to={to}
                className="group inline-flex shrink-0 items-center gap-1 rounded-xs text-sm font-semibold text-brand-secondary outline-focus-ring transition duration-100 ease-linear hover:text-brand-secondary_hover hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
                {viewAllLabel}
                <ArrowRight className="size-4 transition-transform duration-100 ease-linear group-hover:translate-x-0.5" />
            </Link>
        </div>
    );
}

/** One dual-path sign-up card — brand primary button, stock UUI card surface. */
function SignupCtaCard({
    heading,
    supporting,
    buttonLabel,
    href,
}: {
    heading: string;
    supporting: string;
    buttonLabel: string;
    href: string;
}) {
    return (
        <div className="flex flex-col items-start gap-5 rounded-2xl bg-secondary p-8 ring-1 ring-secondary_alt">
            <div className="flex flex-col gap-2">
                <Text as="h2" variant="heading2">
                    {heading}
                </Text>
                <p className="text-md text-tertiary">{supporting}</p>
            </div>
            <Button color="primary" size="lg" href={href}>
                {buttonLabel}
            </Button>
        </div>
    );
}

export function HomeLanding({
    jobs,
    count,
    companies,
    posts,
    talent,
    language,
    labels,
    boardName,
    candidatesEnabled,
    employersEnabled,
}: {
    jobs: PublicJobCard[];
    /** Total open-role count when the API returned one (honest hero stat). */
    count?: number;
    /** Companies-hiring strip source — the section is omitted when empty. */
    companies: HomeCompanyCard[];
    /** Latest blog posts, or null when the blog feature is off (not fetched). */
    posts: PublicBlogPostSummary[] | null;
    /** Talent-directory cards, or null when the feature is off / restricted. */
    talent: TalentDirectoryEntry[] | null;
    language: string;
    labels?: BoardLabelOverrides;
    /** Board display name — the employer CTA supporting copy interpolates it. */
    boardName: string;
    /** Whether the board accepts candidate accounts (gates the candidate CTA). */
    candidatesEnabled: boolean;
    /** Whether the board accepts employer accounts (gates the employer CTA). */
    employersEnabled: boolean;
}) {
    const copy = boardCopy(language, labels);
    const latestJobs = jobs.slice(0, MAX_LANDING_JOBS);
    const strip = companies.slice(0, MAX_LANDING_COMPANIES);
    const latestPosts = posts?.slice(0, MAX_LANDING_POSTS) ?? [];
    const featuredTalent = talent?.slice(0, MAX_LANDING_TALENT) ?? [];
    const showCtaBand = candidatesEnabled || employersEnabled;

    return (
        <PageBody
            band={
                <ListingPageHeader
                    eyebrow={
                        typeof count === "number" ? (
                            <Badge type="pill-color" color="brand" size="lg">
                                {count.toLocaleString(language)}{" "}
                                {count === 1 ? copy.entity.jobSingular : copy.entity.jobPlural}
                            </Badge>
                        ) : undefined
                    }
                    title={m.home_heroHeadline()}
                    subtitle={m.home_heroSupporting()}
                    search={<HomeHeroSearch language={language} labels={labels} />}
                />
            }
        >
            {/* The landing keeps its generous section rhythm inside the shared
                container (PageBody's own gap-8 wraps this single child). */}
            <div className="flex flex-col gap-16 md:gap-20">
                {/* ── Latest jobs — always; every card keeps its typed detail link ─ */}
                <section className="flex flex-col gap-6">
                    <SectionHeader title={m.home_latestJobsHeading()} viewAllLabel={m.home_viewAllJobsLabel()} to="/jobs" />
                    <JobList jobs={latestJobs} language={language} labels={labels} />
                </section>

                {/* ── Companies (omitted whole when empty) ─────────────────────── */}
                {strip.length > 0 ? (
                    <section className="flex flex-col gap-6">
                        <SectionHeader
                            title={m.home_companiesHeading()}
                            viewAllLabel={m.home_viewAllCompaniesLabel()}
                            to="/companies"
                        />
                        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                            {strip.map((company) => (
                                <CompanyCard
                                    key={company.id}
                                    companySlug={company.slug}
                                    name={company.name}
                                    logoUrl={company.logoUrl}
                                    description={company.description}
                                    publishedJobCount={company.publishedJobCount}
                                    jobCountLabel={jobCountLabel(company.publishedJobCount)}
                                />
                            ))}
                        </div>
                    </section>
                ) : null}

                {/* ── Blog (only when the feature is on AND there are posts) ────── */}
                {latestPosts.length > 0 ? (
                    <section className="flex flex-col gap-6">
                        <SectionHeader title={m.home_blogHeading()} viewAllLabel={m.home_viewAllBlogLabel()} to="/blog" />
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {latestPosts.map((post) => (
                                <PostCard key={post.id} post={post} />
                            ))}
                        </div>
                    </section>
                ) : null}

                {/* ── Talent (only when the feature is on AND there are profiles) ─ */}
                {featuredTalent.length > 0 ? (
                    <section className="flex flex-col gap-6">
                        <SectionHeader
                            title={m.home_talentHeading()}
                            viewAllLabel={m.home_viewAllTalentLabel()}
                            to="/talent"
                        />
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {featuredTalent.map((candidate) => (
                                <TalentCard key={candidate.handle ?? candidate.displayName} candidate={candidate} />
                            ))}
                        </div>
                    </section>
                ) : null}

                {/* ── Dual-path sign-up band (mirrors resolveSignupDestination) ─── */}
                {showCtaBand ? (
                    <section
                        className={cx("grid gap-5", candidatesEnabled && employersEnabled ? "md:grid-cols-2" : "")}
                    >
                        {candidatesEnabled ? (
                            <SignupCtaCard
                                heading={m.home_candidateCtaHeading()}
                                supporting={m.home_candidateCtaSupporting()}
                                buttonLabel={m.home_candidateCtaButton()}
                                href="/auth/sign-up"
                            />
                        ) : null}
                        {employersEnabled ? (
                            <SignupCtaCard
                                heading={m.home_employerCtaHeading()}
                                supporting={m.home_employerCtaSupporting({ boardName })}
                                buttonLabel={m.home_employerCtaButton()}
                                href="/auth/employer/sign-up"
                            />
                        ) : null}
                    </section>
                ) : null}
            </div>
        </PageBody>
    );
}
