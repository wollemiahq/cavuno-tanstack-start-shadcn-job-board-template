import { createFileRoute, notFound } from "@tanstack/react-router";

import { isNotFound } from "@cavuno/board";

import { LegalPageView } from "../components/legal-page";
import { PageBody } from "@/components/board/page-body";
import { LEGAL_PAGES, legalMetaDescription } from "../lib/legal";
import { m } from "../paraglide/messages";
import { getLegalPage, getSeoBase } from "../server/queries";

const META = LEGAL_PAGES.impressum;

export const Route = createFileRoute("/impressum")({
  // Full-bleed: the shared `PageBody` owns the width (CAV-502).
  staticData: { fullBleed: true },
  loader: async () => {
    try {
      const [page, seo] = await Promise.all([
        getLegalPage({ data: { type: "impressum" } }),
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
            { title: loaderData.page.title },
            {
              name: "description",
              content: legalMetaDescription(loaderData.page.content),
            },
          ],
          links: [{ rel: "canonical", href: `${loaderData.seo.origin}${META.path}` }],
        }
      : {},
  component: ImpressumPage,
  notFoundComponent: () => (
    <PageBody>
      <p className="rounded-lg border border-dashed border-secondary p-10 text-center text-tertiary">
        {m.notFound_pageNotFound()}
      </p>
    </PageBody>
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
