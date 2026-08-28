import { Link, useLocation } from '@tanstack/react-router';
import { ArrowRight, Search } from 'lucide-react';

import { m } from '../../paraglide/messages';

import type { JobCardVM } from '@/board/job-view-model';
import { CompanyCard } from '@/components/board/company-card';
import { JobCard } from '@/components/board/job-card';
import { SaveJobButton } from '@/components/board/save-job-button';
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
import { localizePath } from '@/lib/localized-path';
import { httpsAssetUrl } from '@/lib/site-branding';
import type {
  PublicBlogPostSummary,
  TalentDirectoryEntry,
} from '@cavuno/board';

export interface HomeCompanyCard {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  /**
   * Card teaser from `CompanyPublic.summary` (authored or API-derived).
   * Do not pass long-form description HTML here.
   */
  summary: string | null;
  publishedJobCount: number;
  /** Pre-resolved, pluralized "N open job(s)" label from the route. */
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
 * The category browse rail. Counts are the live board-wide totals from
 * `taxonomy.categories.list({ sort: 'jobCount' })`, not a page-window facet.
 */
function CategoryBrowse({ categories }: { categories: HomeCategoryCard[] }) {
  return (
    <Grid as="ul" columns={{ base: 2, md: 3, lg: 4 }} gap="3">
      {categories.map((category) => (
        <li key={category.slug}>
          <Card
            size="sm"
            className="relative h-full transition-shadow hover:shadow-md"
          >
            <CardContent className="flex flex-col gap-1">
              <a
                href={localizePath(category.href)}
                className="focus-visible:ring-ring/50 text-foreground rounded-sm text-sm font-medium outline-none after:absolute after:inset-0 after:z-(--z-card-overlay) after:rounded-[inherit] hover:underline focus-visible:ring-2"
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
      <Grid as="ul" columns={{ base: 1, sm: 2, lg: 3 }} gap="4">
        {companies.map((company) => (
          <li key={company.id} className="h-full">
            {/* Reuse the shared CompanyCard (the companies index card) rather
                than a call-site pill variant — one design system. */}
            <CompanyCard
              companySlug={company.slug}
              name={company.name}
              logoUrl={company.logoUrl}
              summary={company.summary}
              publishedJobCount={company.publishedJobCount}
              jobCountLabel={company.openJobsLabel}
            />
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
      <CardFooter className="mt-auto">
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
  profileUnlocks = false,
  boardName,
  candidatesEnabled,
  employersEnabled,
  publicJobSubmission = false,
  viewer,
  onSaveJob,
  backgroundImageUrl,
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
  /** Opaque `/p/{id}` links when the board sells profile unlocks. */
  profileUnlocks?: boolean;
  boardName: string;
  candidatesEnabled: boolean;
  employersEnabled: boolean;
  publicJobSubmission?: boolean;
  /**
   * Signed-in candidate (or `null` when anonymous), threaded from the root
   * loader by the route — same source the `/jobs` surfaces read. Gates the
   * per-card save control exactly like the workspace list (anonymous → a
   * sign-in redirect affordance).
   */
  viewer: { emailVerified: boolean } | null;
  /** Persists a saved job — the route forwards the `saveJob` server function. */
  onSaveJob: (jobId: string) => Promise<void>;
  /** HTTPS hero photo from `src/branding.json`; anything else keeps the dither. */
  backgroundImageUrl?: string | null;
}) {
  const heroPhotoUrl = httpsAssetUrl(backgroundImageUrl);
  // Return here after the save flow's sign-in / verify-email detour (mirrors
  // the `/jobs` list, which reads the current href the same way).
  // The EXTERNAL localized URL — post-auth redirects must land back on
  // /fr/emplois, not the delocalized router path.
  const returnTo = useLocation({
    select: (location) => localizePath(location.href),
  });
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
              <div
                className="relative isolate overflow-hidden"
                data-hero-background={heroPhotoUrl ? 'photo' : 'dither'}
              >
                {heroPhotoUrl ? (
                  <img
                    src={heroPhotoUrl}
                    alt=""
                    className="pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover"
                  />
                ) : (
                  <DitherCanvas className="pointer-events-none absolute inset-0 -z-10 h-full w-full" />
                )}
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
                  <JobCard
                    vm={vm}
                    linkTo="workspace"
                    action={
                      <SaveJobButton
                        jobId={vm.id}
                        viewer={viewer}
                        returnTo={returnTo}
                        presentation="icon"
                        labels={{
                          save: m.companyJobDetail_saveJobLabel(),
                          saving: m.companyJobDetail_savingLabel(),
                          saved: m.companyJobDetail_savedViewInAccountLabel(),
                          error: m.saveJobButton_errorText(),
                        }}
                        onSave={onSaveJob}
                      />
                    }
                  />
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
                <li key={candidate.id}>
                  <TalentCard
                    candidate={candidate}
                    profileUnlocks={profileUnlocks}
                  />
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
                  {/* Home blog strip is below-fold — keep covers lazy so they
                      do not compete with true LCP. Priority lives on /blog. */}
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
