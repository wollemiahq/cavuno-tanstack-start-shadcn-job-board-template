import { boardCopy } from '#/copy';
import { isNotFound } from '@cavuno/board';
import { createBreadcrumbJsonLd } from '@cavuno/board/seo';
import { createFileRoute, notFound } from '@tanstack/react-router';
import { UserRoundX } from 'lucide-react';

import { m } from '../paraglide/messages';
import { getSeoBase, getTalentProfile } from '../server/queries';

import { getTalentSearchLabels } from '@/board/talent-search-labels';
import { toTalentProfileVM } from '@/board/talent-view-model';
import { PageHeaderWithBreadcrumb } from '@/components/board/page-header-with-breadcrumb';
import { TalentProfileContent } from '@/components/board/talent-profile-content';
import { JsonLd } from '@/components/json-ld';
import { Page, PageContent, PageHeader } from '@/components/layout/page';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

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
              title: m.publicProfile_pageTitle({
                name:
                  loaderData.profile.displayName ??
                  m.publicProfile_profileFallbackLabel(),
                boardName: loaderData.seo.boardName,
              }),
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
    <Page width="content">
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
    <Page width="content">
      <PageHeaderWithBreadcrumb
        width="content"
        breadcrumb={{
          ariaLabel: copy.jobDetail.breadcrumbAriaLabel,
          items: [
            { name: copy.breadcrumbs.home, href: '/' },
            { name: copy.breadcrumbs.talent, href: '/talent' },
            { name: displayName },
          ],
        }}
        title={displayName}
      />
      <PageContent>
        <JsonLd data={jsonLd} />
        <article>
          <Card>
            <CardContent className="py-1 md:px-8">
              <TalentProfileContent
                vm={toTalentProfileVM(
                  profile,
                  seo.language,
                  getTalentSearchLabels(),
                )}
                headingAs="h1"
                showName={false}
              />
            </CardContent>
          </Card>
        </article>
      </PageContent>
    </Page>
  );
}
