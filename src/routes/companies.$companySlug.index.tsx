import { isNotFound } from '@cavuno/board';
import { createFileRoute, getRouteApi, notFound } from '@tanstack/react-router';
import { Building2 } from 'lucide-react';

import { m } from '../paraglide/messages';
import { getCompanyProfilePage } from '../server/companies-pages';
import { getSimilarCompanies } from '../server/queries';
import { CompanyOverview } from './-company-overview';

import { jsonLdHeadScripts } from '@/components/json-ld';
import { PageLayout } from '@/components/layout/page-layout';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

export const Route = createFileRoute('/companies/$companySlug/')({
  // The shared page layout owns the canonical route geometry.
  staticData: { fullBleed: true, ownsMain: true },
  loader: async ({ params }) => {
    try {
      // ONE server fn: company, jobs, salary gate and SEO base resolve in a
      // single parallel batch server-side (see getCompanyProfilePage). The
      // old shape awaited a three-read Promise.all and THEN an SEO call,
      // serializing a second wave just to build head tags.
      // Similar companies is a below-the-fold, search-backed rail. It needs
      // only the slug, so it is kicked off BEFORE the page batch is awaited —
      // starting it after made it a second serial wave, and SSR renders the
      // rail into the document, so "deferred" did not keep it off the
      // first-byte path. Now it overlaps the four page reads instead.
      // Degrades to empty, never fatal.
      const similar = getSimilarCompanies({
        data: { companySlug: params.companySlug, limit: 6 },
      })
        .then((r) => r.data)
        .catch(() => []);
      const pageData = await getCompanyProfilePage({
        data: { companySlug: params.companySlug },
      });
      return { ...pageData, similar };
    } catch (error) {
      if (isNotFound(error)) throw notFound();
      throw error;
    }
  },
  head: ({ loaderData }) =>
    loaderData
      ? { ...loaderData.head, scripts: jsonLdHeadScripts(loaderData.jsonLd) }
      : {},
  component: CompanyPage,
  notFoundComponent: () => (
    <PageLayout>
      <Empty className="py-12">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Building2 />
          </EmptyMedia>
          <EmptyTitle>{m.companyDetail_notFoundText()}</EmptyTitle>
        </EmptyHeader>
      </Empty>
    </PageLayout>
  ),
});

const rootApi = getRouteApi('__root__');

function CompanyPage() {
  const { company, jobs, similar, salarySummary, hasSalaries } =
    Route.useLoaderData();
  const { board } = rootApi.useLoaderData();
  return (
    <CompanyOverview
      company={company}
      jobs={jobs}
      similar={similar}
      salarySummary={salarySummary}
      hasSalaries={hasSalaries}
      board={board}
    />
  );
}
