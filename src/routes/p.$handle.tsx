import { boardCopy } from '#/copy';

import { isNotFound } from '@cavuno/board';
import { createBreadcrumbJsonLd } from '@cavuno/board/seo';
import {
  createFileRoute,
  getRouteApi,
  notFound,
  useLocation,
} from '@tanstack/react-router';
import { UserRoundX } from 'lucide-react';

import { m } from '../paraglide/messages';
import { getSeoBase, getTalentProfile } from '../server/queries';

import { getTalentSearchLabels } from '@/board/talent-search-labels';
import {
  resolveTalentDetailCta,
  toTalentProfileVM,
  type TalentDetailViewer,
} from '@/board/talent-view-model';
import {
  TalentProfileContent,
  TalentProfileIdentity,
} from '@/components/board/talent-profile-content';
import { JsonLd } from '@/components/json-ld';
import { Container } from '@/components/layout/container';
import { Page, PageContent, PageHeader } from '@/components/layout/page';
import { PageLayout } from '@/components/layout/page-layout';
import { DitherCanvas } from '@/components/marketing/dither-canvas';
import { buttonVariants } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { candidateSignInHref } from '@/lib/candidate-return-to';
import { headTitle } from '@/lib/page-title';

/** The board's employer pricing / talent-plan offer surface. */
const PRICING_HREF = '/employers';

const rootApi = getRouteApi('__root__');

export const Route = createFileRoute('/p/$handle')({
  staticData: { fullBleed: true, ownsMain: true },
  loader: async ({ params }) => {
    try {
      const [profile, seo] = await Promise.all([
        getTalentProfile({ data: { handle: params.handle } }),
        getSeoBase(),
      ]);
      return { profile, seo };
    } catch (error) {
      if (isNotFound(error)) throw notFound();
      throw error;
    }
  },
  head: ({ loaderData }) =>
    loaderData
      ? {
          meta: [
            {
              title: headTitle(
                loaderData.seo.boardName,
                loaderData.profile.displayName ??
                  m.publicProfile_profileFallbackLabel(),
              ),
            },
            ...(loaderData.profile.headline
              ? [
                  {
                    name: 'description',
                    content: loaderData.profile.headline,
                  },
                ]
              : []),
          ],
          links: [
            {
              rel: 'canonical',
              href: `${loaderData.seo.origin}/p/${loaderData.profile.handle}`,
            },
          ],
        }
      : {},
  component: TalentProfilePage,
  notFoundComponent: TalentProfileNotFound,
});

function TalentProfileNotFound() {
  return (
    <Page width="wide">
      <PageContent
        header={<PageHeader title={m.publicProfile_profileFallbackLabel()} />}
      >
        <Empty className="min-h-80 border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UserRoundX aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>{m.publicProfile_notFoundText()}</EmptyTitle>
            <EmptyDescription>
              {m.talentDirectory_notFoundText()}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <a
              href="/talent"
              className={buttonVariants({ variant: 'outline' })}
            >
              {m.talentDirectory_title()}
            </a>
          </EmptyContent>
        </Empty>
      </PageContent>
    </Page>
  );
}

function TalentProfilePage() {
  const { profile, seo } = Route.useLoaderData();
  // The viewer session is read from the root loader (identity + board
  // features) exactly as the talent search pane does (talent.index →
  // -selected-talent-detail), so the profile hero's Message CTA is gated by
  // the SAME matrix as the pane — no Board API call from the browser.
  const { user, board } = rootApi.useLoaderData();
  const location = useLocation();
  const copy = boardCopy(seo.language);
  const vm = toTalentProfileVM(profile, seo.language, getTalentSearchLabels());
  const viewer: TalentDetailViewer =
    user === null
      ? { kind: 'anonymous' }
      : user.role === 'employer'
        ? { kind: 'employer', hasTalentAccess: true }
        : { kind: 'candidate' };
  // Reuse the canonical CTA resolver. `showViewProfile` stays off — this IS the
  // canonical profile, and the candidate's name is the profile link — so the
  // resolver yields only the gated Message action (sign-in for anonymous,
  // pricing for an employer without access, none for a candidate / when board
  // messaging is off).
  const cta = resolveTalentDetailCta({
    viewer,
    detailHref: vm.detailHref,
    signInHref: candidateSignInHref(location.href),
    pricingHref: PRICING_HREF,
    labels: {
      message: m.talentSearch_messageLabel(),
      viewProfile: vm.viewProfileLabel,
    },
    showViewProfile: false,
    messagingEnabled: board.features.messaging,
  });
  const displayName =
    profile.displayName ?? m.publicProfile_anonymousCandidateLabel();
  const canonical = `${seo.origin}/p/${profile.handle}`;
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'ProfilePage',
      url: canonical,
      mainEntity: {
        '@type': 'Person',
        '@id': `${canonical}#person`,
        ...(profile.displayName ? { name: profile.displayName } : {}),
        ...(profile.headline ? { jobTitle: profile.headline } : {}),
        ...(profile.bio ? { description: profile.bio } : {}),
        ...(profile.location ? { homeLocation: profile.location } : {}),
        ...(profile.skills.length > 0
          ? { knowsAbout: profile.skills.map((skill) => skill.name) }
          : {}),
      },
    },
    createBreadcrumbJsonLd([
      { label: copy.breadcrumbs.home, href: seo.origin },
      { label: copy.breadcrumbs.talent, href: `${seo.origin}/talent` },
      { label: displayName },
    ]),
  ].filter((entry): entry is Record<string, unknown> => entry !== null);

  return (
    // Full-bleed hero band — the SAME composition as the job-detail and
    // company-profile pages (the shared full-bleed band,
    // seated on the shared `--header-space` rhythm), so every entity page opens
    // the same way. The band carries the identity (avatar + name H1 + headline
    // meta line + location/availability badges). The decorative dither field
    // mounts once here (never inside the swapping search pane), reads the live
    // --foreground token, and respects prefers-reduced-motion.
    <PageLayout
      band={
        <div className="border-border bg-secondary relative isolate overflow-hidden border-b">
          <DitherCanvas className="pointer-events-none absolute inset-0 -z-10 h-full w-full" />
          <Container width="wide">
            <div className="flex flex-col pt-(--header-space) pb-8 md:pb-10">
              {/* Identity left, primary action right — the same header-row
                  structure the canonical PageHeader (and the job-detail /
                  company headers) use: `md:flex-row md:items-start
                  md:justify-between`, with the actions `shrink-0` on the right.
                  The Message action is gated by the resolved CTA. */}
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <TalentProfileIdentity vm={vm} headingAs="h1" size="xl" />
                {cta.message ? (
                  <div
                    data-slot="talent-profile-actions"
                    className="flex shrink-0 flex-wrap items-center gap-2"
                  >
                    <a href={cta.message.href} className={buttonVariants()}>
                      {cta.message.label}
                    </a>
                  </div>
                ) : null}
              </div>
            </div>
          </Container>
        </div>
      }
    >
      <JsonLd data={jsonLd} />
      {/* The band owns the identity (H1), so the body drops its header and
          leads with the bio; sections render as H2s beneath the single H1. The
          article carries NO bespoke max-width — it shares the page's wide
          container geometry with the hero band above (same left gutter, same
          column), so the hero and body align as one column, the job-detail
          width rhythm. */}
      <article className="min-w-0">
        <TalentProfileContent vm={vm} headingAs="h1" showHeader={false} />
      </article>
    </PageLayout>
  );
}
