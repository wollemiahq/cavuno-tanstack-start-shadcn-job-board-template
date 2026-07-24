import { isNotFound } from '@cavuno/board';
import { createFileRoute, notFound } from '@tanstack/react-router';

import { LegalPageView } from '../components/legal-page';
import { LEGAL_PAGES, legalMetaDescription } from '../lib/legal';
import { m } from '../paraglide/messages';
import { getLegalPage, getSeoBase } from '../server/queries';

import { PageLayout } from '@/components/layout/page-layout';
import { headTitle } from '@/lib/page-title';

const META = LEGAL_PAGES.impressum;

export const Route = createFileRoute('/impressum')({
  // The shared page layout owns the full-width route geometry.
  staticData: { fullBleed: true, ownsMain: true },
  loader: async () => {
    try {
      const [page, seo] = await Promise.all([
        getLegalPage({ data: { type: 'impressum' } }),
        getSeoBase(),
      ]);
      return { page, seo };
    } catch (error) {
      // Impressum is gated on the board's `impressumEnabled` flag → 404 when off.
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
                loaderData?.seo.boardName,
                loaderData.page.title,
              ),
            },
            {
              name: 'description',
              content: legalMetaDescription(loaderData.page.content),
            },
          ],
          links: [
            { rel: 'canonical', href: `${loaderData.seo.origin}${META.path}` },
          ],
        }
      : {},
  component: ImpressumPage,
  notFoundComponent: () => (
    <PageLayout>
      <p className="border-border text-muted-foreground rounded-lg border border-dashed p-10 text-center">
        {m.notFound_pageNotFound()}
      </p>
    </PageLayout>
  ),
});

function ImpressumPage() {
  const { page, seo } = Route.useLoaderData();
  return (
    <LegalPageView
      page={page}
      origin={seo.origin}
      meta={META}
      language={seo.language}
      labels={seo.labels}
    />
  );
}
