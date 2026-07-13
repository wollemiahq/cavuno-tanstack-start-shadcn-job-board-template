import { Link } from "@tanstack/react-router";
import { ArrowRight, Building2, Search } from "lucide-react";

import type { PublicBlogPostSummary, TalentDirectoryEntry } from "@cavuno/board";

import type { JobCardVM } from "@/board/job-view-model";
import { Bleed } from "@/components/layout/bleed";
import { Box } from "@/components/layout/box";
import { Container } from "@/components/layout/container";
import { Grid } from "@/components/layout/grid";
import { Page, PageContent, PageHeader, PageSection } from "@/components/layout/page";
import { buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { PostCard } from "@/components/post-card";
import { TalentCard } from "@/components/talent-card";
import { initialsOf } from "@/lib/initials";
import { m } from "../../paraglide/messages";

const MAX_JOB_TAGS = 2;

export interface HomeCompanyCard {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  description: string | null;
  openJobsLabel: string;
}

function ViewAllAction({ label, to }: { label: string; to: "/jobs" | "/blog" | "/talent" }) {
  return (
    <Link to={to} className={buttonVariants({ variant: "ghost", size: "sm" })}>
      {label}
      <ArrowRight aria-hidden="true" data-icon="inline-end" />
    </Link>
  );
}

function HomeJobCard({ vm }: { vm: JobCardVM }) {
  const title =
    vm.hasDetailLink && vm.companySlug && vm.jobSlug ? (
      <Link
        to="/companies/$companySlug/jobs/$jobSlug"
        params={{ companySlug: vm.companySlug, jobSlug: vm.jobSlug }}
        className="rounded-sm outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/30"
      >
        {vm.title}
      </Link>
    ) : (
      vm.title
    );
  const visibleTags = vm.tags.slice(0, MAX_JOB_TAGS);
  const hiddenTagCount = Math.max(0, vm.tags.length - visibleTags.length);

  return (
    <article className="h-full">
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardHeader>
          <div className="flex items-start gap-3">
            <Avatar size="lg">
              {vm.companyLogoUrl ? (
                <AvatarImage
                  src={vm.companyLogoUrl}
                  alt={vm.companyName ?? vm.title}
                />
              ) : null}
              <AvatarFallback>{initialsOf(vm.companyAvatarName)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              {vm.companyName ? (
                <p className="text-xs font-medium text-muted-foreground">
                  {vm.companyName}
                </p>
              ) : null}
              <CardTitle>
                <h3 className="line-clamp-2 text-balance">{title}</h3>
              </CardTitle>
              {vm.summary ? (
                <CardDescription className="line-clamp-2">
                  {vm.summary}
                </CardDescription>
              ) : null}
            </div>
          </div>
        </CardHeader>

        {vm.compLine ? (
          <CardContent>
            <p className="text-sm font-medium">{vm.compLine}</p>
          </CardContent>
        ) : null}

        {visibleTags.length > 0 || vm.postedAtLabel ? (
          <CardFooter className="mt-auto flex-wrap gap-2">
            {visibleTags.map((tag) => (
              <a
                key={tag.key}
                href={tag.href}
                className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30"
              >
                {tag.name}
              </a>
            ))}
            {hiddenTagCount > 0 ? (
              <span className="text-xs text-muted-foreground">+{hiddenTagCount}</span>
            ) : null}
            {vm.postedAtLabel ? (
              <span className="ml-auto text-xs text-muted-foreground">{vm.postedAtLabel}</span>
            ) : null}
          </CardFooter>
        ) : null}
      </Card>
    </article>
  );
}

function HiringIndex({ companies }: { companies: HomeCompanyCard[] }) {
  return (
    <PageSection title={m.home_companiesHeading()}>
      <Grid as="ul" columns={{ base: 1, sm: 2 }} gap="3">
        {companies.map((company) => (
          <li key={company.id}>
            <Card size="sm" className="h-full shadow-none">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                    <Building2 aria-hidden="true" className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <CardTitle>
                      <h3 className="line-clamp-2">
                        <Link
                          to="/companies/$companySlug"
                          params={{ companySlug: company.slug }}
                          className="rounded-sm outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/30"
                        >
                          {company.name}
                        </Link>
                      </h3>
                    </CardTitle>
                    <CardDescription>{company.openJobsLabel}</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </li>
        ))}
      </Grid>
    </PageSection>
  );
}

function SignupCtaCard({
  heading,
  supporting,
  buttonLabel,
  href,
}: {
  heading: string;
  supporting: string;
  buttonLabel: string;
  href: "/auth/sign-up" | "/auth/employer/sign-up";
}) {
  return (
    <Card className="h-full bg-muted/50 shadow-none">
      <CardHeader>
        <CardTitle>
          <h2>{heading}</h2>
        </CardTitle>
        <CardDescription>{supporting}</CardDescription>
      </CardHeader>
      <CardFooter className="mt-auto">
        <Link to={href} className={buttonVariants({ size: "lg" })}>
          {buttonLabel}
        </Link>
      </CardFooter>
    </Card>
  );
}

export function HomeLanding({
  jobs,
  countLabel,
  companies,
  posts,
  talent,
  boardName,
  candidatesEnabled,
  employersEnabled,
  publicJobSubmission = false,
}: {
  jobs: JobCardVM[];
  countLabel?: string;
  companies: HomeCompanyCard[];
  posts: PublicBlogPostSummary[] | null;
  talent: TalentDirectoryEntry[] | null;
  boardName: string;
  candidatesEnabled: boolean;
  employersEnabled: boolean;
  publicJobSubmission?: boolean;
}) {
  const latestJobs = jobs;
  const hiringCompanies = companies;
  const latestPosts = posts ?? [];
  const featuredTalent = talent ?? [];
  const showCtaBand = candidatesEnabled || employersEnabled;

  return (
    <Page width="wide">
      <PageContent
        header={
          <Bleed>
            <Box background="muted" border="bottom" padding={{ base: "8", md: "12" }}>
              <Container width="wide">
                <Grid columns={hiringCompanies.length > 0 ? { base: 1, lg: 2 } : 1} gap="8">
                  <PageHeader
                    eyebrow={
                      countLabel ? (
                        <p className="text-sm font-medium text-muted-foreground">
                          {countLabel}
                        </p>
                      ) : undefined
                    }
                    title={m.home_heroHeadline()}
                    description={m.home_heroSupporting()}
                    actions={
                      <>
                        <Link to="/jobs" className={buttonVariants({ size: "lg" })}>
                          {m.home_viewAllJobsLabel()}
                          <ArrowRight aria-hidden="true" data-icon="inline-end" />
                        </Link>
                        {publicJobSubmission ? (
                          <Link
                            to="/post"
                            className={buttonVariants({
                              variant: "outline",
                              size: "lg",
                            })}
                          >
                            {m.siteHeader_postJobLabel()}
                          </Link>
                        ) : null}
                      </>
                    }
                  />
                  {hiringCompanies.length > 0 ? <HiringIndex companies={hiringCompanies} /> : null}
                </Grid>
              </Container>
            </Box>
          </Bleed>
        }
      >
        {latestJobs.length > 0 ? (
          <PageSection title={m.home_latestJobsHeading()}>
            <Grid as="ul" columns={{ base: 1, md: 2 }} gap="5">
              {latestJobs.map((vm) => (
                <li key={vm.id}>
                  <HomeJobCard vm={vm} />
                </li>
              ))}
            </Grid>
          </PageSection>
        ) : (
          <PageSection ariaLabel={m.home_emptyHeading()}>
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Search aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle role="heading" aria-level={2}>
                  {m.home_emptyHeading()}
                </EmptyTitle>
                <EmptyDescription>{m.home_emptySupporting()}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </PageSection>
        )}

        {featuredTalent.length > 0 ? (
          <PageSection
            title={m.home_talentHeading()}
            actions={<ViewAllAction label={m.home_viewAllTalentLabel()} to="/talent" />}
          >
            <Grid as="ul" columns={{ base: 1, sm: 2, lg: 3 }} gap="4">
              {featuredTalent.map((candidate) => (
                <li key={candidate.handle ?? candidate.displayName}>
                  <TalentCard candidate={candidate} />
                </li>
              ))}
            </Grid>
          </PageSection>
        ) : null}

        {latestPosts.length > 0 ? (
          <PageSection
            title={m.home_blogHeading()}
            actions={<ViewAllAction label={m.home_viewAllBlogLabel()} to="/blog" />}
          >
            <Grid as="ul" columns={{ base: 1, md: 2, lg: 3 }} gap="6">
              {latestPosts.map((post) => (
                <li key={post.id}>
                  <PostCard post={post} />
                </li>
              ))}
            </Grid>
          </PageSection>
        ) : null}

        {showCtaBand ? (
          <Grid columns={candidatesEnabled && employersEnabled ? { base: 1, md: 2 } : 1} gap="5">
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
          </Grid>
        ) : null}
      </PageContent>
    </Page>
  );
}
