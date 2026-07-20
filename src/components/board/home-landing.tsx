import { Link } from '@tanstack/react-router';
import { ArrowRight, Search } from 'lucide-react';

import { m } from '../../paraglide/messages';

import type { JobCardVM } from '@/board/job-view-model';
import { CompanyAvatar } from '@/components/board/company-avatar';
import { Bleed } from '@/components/layout/bleed';
import { Box } from '@/components/layout/box';
import { Container } from '@/components/layout/container';
import { Grid } from '@/components/layout/grid';
import {
  Page,
  PageContent,
  PageHeader,
  PageSection,
} from '@/components/layout/page';
import { DitherCanvas } from '@/components/marketing/dither-canvas';
import { PostCard } from '@/components/post-card';
import { TalentCard } from '@/components/talent-card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { clampList } from '@/lib/clamp-list';
import type {
  PublicBlogPostSummary,
  TalentDirectoryEntry,
} from '@cavuno/board';

const MAX_JOB_TAGS = 2;

export interface HomeCompanyCard {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  description: string | null;
  openJobsLabel: string;
}

export interface HomeCategoryCard {
  slug: string;
  name: string;
  /** Pre-resolved "N jobs" label, or null when the route has no count. */
  countLabel: string | null;
  /** Resolved by the route via `jobsCategoryPath` — never string-built here. */
  href: string;
}

function ViewAllAction({
  label,
  to,
}: {
  label: string;
  to: '/jobs' | '/blog' | '/talent' | '/companies';
}) {
  return (
    <Link to={to} className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
      {label}
      <ArrowRight aria-hidden="true" data-icon="inline-end" />
    </Link>
  );
}

/**
 * The category browse rail, built from the browse envelope's related searches —
 * already ranked by the API and counted, so it costs no extra read.
 */
function CategoryBrowse({ categories }: { categories: HomeCategoryCard[] }) {
  return (
    <Grid as="ul" columns={{ base: 2, md: 3, lg: 4 }} gap="3">
      {categories.map((category) => (
        <li key={category.slug}>
          <Card
            size="sm"
            className="h-full transition-shadow hover:shadow-md"
          >
            <CardContent className="flex flex-col gap-1">
              <a
                href={category.href}
                className="focus-visible:ring-ring/30 text-foreground rounded-sm text-sm font-medium outline-none hover:underline focus-visible:ring-3"
              >
                {category.name}
              </a>
              {category.countLabel ? (
                <span className="text-muted-foreground text-xs">
                  {category.countLabel}
                </span>
              ) : null}
            </CardContent>
          </Card>
        </li>
      ))}
    </Grid>
  );
}

function HomeJobCard({ vm }: { vm: JobCardVM }) {
  const title =
    vm.hasDetailLink && vm.companySlug && vm.jobSlug ? (
      <Link
        to="/companies/$companySlug/jobs/$jobSlug"
        params={{ companySlug: vm.companySlug, jobSlug: vm.jobSlug }}
        className="focus-visible:ring-ring/30 rounded-sm outline-none hover:underline focus-visible:ring-3"
      >
        {vm.title}
      </Link>
    ) : (
      vm.title
    );
  const { visible: visibleTags, overflow: hiddenTagCount } = clampList(
    vm.tags,
    MAX_JOB_TAGS,
  );

  return (
    <article className="h-full">
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardHeader>
          <div className="flex items-start gap-3">
            <CompanyAvatar
              name={vm.companyAvatarName}
              logoUrl={vm.companyLogoUrl}
              size="lg"
            />
            <div className="min-w-0 flex-1">
              {vm.companyName ? (
                <p className="text-muted-foreground text-xs font-medium">
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
          // Card zeroes its own pb whenever a footer exists, and CardFooter
          // only self-pads when it carries a border — so a borderless footer
          // has to restore the bottom inset itself.
          <CardFooter className="mt-auto flex-wrap gap-2 pb-(--card-spacing)">
            {visibleTags.map((tag) => (
              <Badge
                key={tag.key}
                variant="secondary"
                render={<a href={tag.href} />}
              >
                {tag.name}
              </Badge>
            ))}
            {hiddenTagCount > 0 ? (
              <span className="text-muted-foreground text-xs">
                +{hiddenTagCount}
              </span>
            ) : null}
            {vm.postedAtLabel ? (
              <span className="text-muted-foreground ml-auto text-xs">
                {vm.postedAtLabel}
              </span>
            ) : null}
          </CardFooter>
        ) : null}
      </Card>
    </article>
  );
}

function HiringIndex({
  companies,
  countLabel,
}: {
  companies: HomeCompanyCard[];
  countLabel?: string;
}) {
  return (
    <PageSection
      eyebrow={countLabel}
      title={m.home_companiesHeading()}
      description={m.home_companiesDescription()}
      actions={
        <ViewAllAction label={m.home_viewAllCompaniesLabel()} to="/companies" />
      }
    >
      <Grid as="ul" columns={{ base: 1, sm: 2, lg: 3 }} gap="3">
        {companies.map((company) => (
          <li key={company.id}>
            <Card size="sm" className="h-full transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <CompanyAvatar
                    name={company.name}
                    logoUrl={company.logoUrl}
                    size="lg"
                  />
                  <div className="min-w-0">
                    <CardTitle>
                      <h3 className="line-clamp-2">
                        <Link
                          to="/companies/$companySlug"
                          params={{ companySlug: company.slug }}
                          className="focus-visible:ring-ring/30 rounded-sm outline-none hover:underline focus-visible:ring-3"
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
  href: '/auth/sign-up' | '/auth/employer/sign-up';
}) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>
          <h2>{heading}</h2>
        </CardTitle>
        <CardDescription>{supporting}</CardDescription>
      </CardHeader>
      <CardFooter className="mt-auto pb-(--card-spacing)">
        <Link to={href} className={buttonVariants({ size: 'lg' })}>
          {buttonLabel}
        </Link>
      </CardFooter>
    </Card>
  );
}

export function HomeLanding({
  jobs,
  jobsCountLabel,
  companiesCountLabel,
  talentCountLabel,
  postsCountLabel,
  categories = [],
  companies,
  posts,
  talent,
  boardName,
  candidatesEnabled,
  employersEnabled,
  publicJobSubmission = false,
}: {
  jobs: JobCardVM[];
  /** Pre-resolved "N jobs" eyebrow for the Latest jobs section. */
  jobsCountLabel?: string;
  /** Pre-resolved "N companies" eyebrow for the Companies section. */
  companiesCountLabel?: string;
  /** Pre-resolved "N candidates" eyebrow for the Featured talent section. */
  talentCountLabel?: string;
  /** Pre-resolved "N posts" eyebrow for the Blog section. */
  postsCountLabel?: string;
  categories?: HomeCategoryCard[];
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
            <Box background="muted" border="bottom">
              {/* The band is relative + clipped so the decorative dither field
                  can sit behind the hero content (counts belong to the section
                  headers below, not the hero). */}
              <div className="relative isolate overflow-hidden">
                <DitherCanvas className="pointer-events-none absolute inset-0 -z-10 h-full w-full" />
                <Container width="wide">
                  <div className="py-8 md:py-12">
                    {/* Hero is the headline + its CTAs only. Companies earn
                        their own section below rather than riding the band. */}
                    <Grid columns={1} gap="8">
                      <PageHeader
                        size="display"
                        title={m.home_heroHeadline()}
                        description={m.home_heroSupporting()}
                        actions={
                          <>
                            <Link
                              to="/jobs"
                              className={buttonVariants({ size: 'lg' })}
                            >
                              {m.home_viewAllJobsLabel()}
                              <ArrowRight
                                aria-hidden="true"
                                data-icon="inline-end"
                              />
                            </Link>
                            {publicJobSubmission ? (
                              <Link
                                to="/post"
                                className={buttonVariants({
                                  variant: 'outline',
                                  size: 'lg',
                                })}
                              >
                                {m.siteHeader_postJobLabel()}
                              </Link>
                            ) : null}
                          </>
                        }
                      />
                    </Grid>
                  </div>
                </Container>
              </div>
            </Box>
          </Bleed>
        }
      >
        {categories.length > 0 ? (
          <PageSection
            title={m.home_categoriesHeading()}
            description={m.home_categoriesDescription()}
          >
            <CategoryBrowse categories={categories} />
          </PageSection>
        ) : null}

        {latestJobs.length > 0 ? (
          <PageSection
            eyebrow={jobsCountLabel}
            title={m.home_latestJobsHeading()}
            description={m.home_latestJobsDescription()}
            actions={
              <ViewAllAction label={m.home_viewAllJobsLabel()} to="/jobs" />
            }
          >
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

        {hiringCompanies.length > 0 ? (
          <HiringIndex
            companies={hiringCompanies}
            countLabel={companiesCountLabel}
          />
        ) : null}

        {featuredTalent.length > 0 ? (
          <PageSection
            eyebrow={talentCountLabel}
            title={m.home_talentHeading()}
            description={m.home_talentDescription()}
            actions={
              <ViewAllAction label={m.home_viewAllTalentLabel()} to="/talent" />
            }
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
            eyebrow={postsCountLabel}
            title={m.home_blogHeading()}
            description={m.home_blogDescription()}
            actions={
              <ViewAllAction label={m.home_viewAllBlogLabel()} to="/blog" />
            }
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
          <Grid
            columns={
              candidatesEnabled && employersEnabled ? { base: 1, md: 2 } : 1
            }
            gap="5"
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
          </Grid>
        ) : null}
      </PageContent>
    </Page>
  );
}
