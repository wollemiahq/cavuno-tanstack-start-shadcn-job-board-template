import { isNotFound } from '@cavuno/board';
import { createFileRoute, notFound } from '@tanstack/react-router';

import { LegalPageView } from '../components/legal-page';
import { LEGAL_PAGES, legalMetaDescription } from '../lib/legal';
import { m } from '../paraglide/messages';
import { getLegalPage, getSeoBase } from '../server/queries';

import { PageBody } from '@/components/board/page-body';

const META = LEGAL_PAGES['cookie-policy'];

export const Route = createFileRoute('/cookie-policy')({
  // Full-bleed: the shared `PageBody` owns the width (CAV-502).
  staticData: { fullBleed: true },
  loader: async () => {
    try {
      const [page, seo] = await Promise.all([
        getLegalPage({ data: { type: 'cookie-policy' } }),
        getSeoBase(),
      ]);
      return { page, seo };
    } catch (error) {
      if (isNotFound(error)) throw notFound();
      throw error;
    }
  },
  head: ({ loaderData }) =>
    loaderData
      ? {
          meta: [
            { title: loaderData.page.title },
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
  component: CookiePolicyPage,
  notFoundComponent: () => (
    <PageBody>
      <p className="border-border text-muted-foreground rounded-lg border border-dashed p-10 text-center">
        {m.notFound_pageNotFound()}
      </p>
    </PageBody>
  ),
});

function CookiePolicyPage() {
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
