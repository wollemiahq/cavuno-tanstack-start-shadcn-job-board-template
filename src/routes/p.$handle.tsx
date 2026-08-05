import { isNotFound } from '@cavuno/board';
import {
  createFileRoute,
  getRouteApi,
  notFound,
  useLocation,
} from '@tanstack/react-router';
import { UserRoundX } from 'lucide-react';

import { m } from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';
import { getTalentProfilePage } from '../server/talent-pages';

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
import { jsonLdHeadScripts } from '@/components/json-ld';
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

/** The board's employer pricing / talent-plan offer surface. */
const PRICING_HREF = '/employers';

const rootApi = getRouteApi('__root__');

export const Route = createFileRoute('/p/$handle')({
  staticData: { fullBleed: true, ownsMain: true },
  loader: async ({ params }) => {
    try {
      return await getTalentProfilePage({ data: { handle: params.handle } });
    } catch (error) {
      if (isNotFound(error)) throw notFound();
      throw error;
    }
  },
  head: ({ loaderData }) =>
    loaderData
      ? { ...loaderData.head, scripts: jsonLdHeadScripts(loaderData.jsonLd) }
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
  const { profile } = Route.useLoaderData();
  // The viewer session is read from the root loader (identity + board
  // features) exactly as the talent search pane does (talent.index →
  // -selected-talent-detail), so the profile hero's Message CTA is gated by
  // the SAME matrix as the pane — no Board API call from the browser.
  const { user, board } = rootApi.useLoaderData();
  const location = useLocation();
  const vm = toTalentProfileVM(profile, getLocale(), getTalentSearchLabels());
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
