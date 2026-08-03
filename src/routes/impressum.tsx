import { isNotFound } from '@cavuno/board';
import { createFileRoute, notFound } from '@tanstack/react-router';

import { LegalPageView } from '../components/legal-page';
import { m } from '../paraglide/messages';
import { getLegalPageView } from '../server/legal-pages';

import { jsonLdHeadScripts } from '@/components/json-ld';
import { PageLayout } from '@/components/layout/page-layout';

export const Route = createFileRoute('/impressum')({
  // The shared page layout owns the full-width route geometry.
  staticData: { fullBleed: true, ownsMain: true },
  loader: async () => {
    try {
      return await getLegalPageView({ data: { type: 'impressum' } });
    } catch (error) {
      // Impressum is gated on the board's `impressumEnabled` flag → 404 when off.
      if (isNotFound(error)) throw notFound();
      throw error;
    }
  },
  head: ({ loaderData }) =>
    loaderData
      ? { ...loaderData.head, scripts: jsonLdHeadScripts(loaderData.jsonLd) }
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
  const { page } = Route.useLoaderData();
  return <LegalPageView page={page} />;
}
