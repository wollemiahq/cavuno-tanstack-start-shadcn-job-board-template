import { boardCopy } from '#/copy';

import { isNotFound } from '@cavuno/board';
import { createBreadcrumbJsonLd } from '@cavuno/board/seo';
import { createFileRoute, notFound } from '@tanstack/react-router';
import { UserRoundX } from 'lucide-react';

import { m } from '../paraglide/messages';
import { getSeoBase, getTalentProfile } from '../server/queries';

import { getTalentSearchLabels } from '@/board/talent-search-labels';
import { toTalentProfileVM } from '@/board/talent-view-model';
import { PageBody } from '@/components/board/page-body';
import {
  TalentProfileContent,
  TalentProfileIdentity,
} from '@/components/board/talent-profile-content';
import { JsonLd } from '@/components/json-ld';
import { Container } from '@/components/layout/container';
import { Page, PageContent, PageHeader } from '@/components/layout/page';
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
import { headTitle } from '@/lib/page-title';

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
  const copy = boardCopy(seo.language, seo.labels);
  const vm = toTalentProfileVM(profile, seo.language, getTalentSearchLabels());
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
    // company-profile pages (`PageBody`'s `band`, `bg-secondary` + `border-b`,
    // seated on the shared `--header-space` rhythm), so every entity page opens
    // the same way. The band carries the identity (avatar + name H1 + headline
    // meta line + location/availability badges), replacing the old name-only
    // hero and the floating headline-but-no-name card. The decorative dither
    // field mounts once here (never inside the swapping search pane), reading
    // the live --foreground token and respecting prefers-reduced-motion.
    <PageBody
      band={
        <div className="border-border bg-secondary relative isolate overflow-hidden border-b">
          <DitherCanvas className="pointer-events-none absolute inset-0 -z-10 h-full w-full" />
          <Container width="wide">
            <div className="flex flex-col pt-(--header-space) pb-8 md:pb-10">
              <TalentProfileIdentity vm={vm} headingAs="h1" size="xl" />
            </div>
          </Container>
        </div>
      }
    >
      <JsonLd data={jsonLd} />
      {/* The band owns the identity (H1), so the body drops its header and
          leads with the bio; sections render as H2s beneath the single H1. */}
      <article className="mx-auto w-full max-w-3xl">
        <TalentProfileContent vm={vm} headingAs="h1" showHeader={false} />
      </article>
    </PageBody>
  );
}
