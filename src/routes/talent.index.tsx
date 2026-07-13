import { Text } from "@/components/text"
import { createFileRoute, Link, notFound } from "@tanstack/react-router";

import { isForbidden, isNotFound } from "@cavuno/board";

import { JsonLd } from "@/components/json-ld";
import { Button, styles as buttonStyles } from "@/components/base/buttons/button";
import { cx } from "@/utils/cx";
import { TalentCard } from "@/components/talent-card";
import { createBreadcrumbJsonLd } from "@cavuno/board/seo";
import { boardCopy } from "#/copy";
import { m } from "../paraglide/messages";
import { getSeoBase, listTalent } from "../server/queries";

interface TalentSearch {
  cursor?: string;
  q?: string;
  skill?: string;
}

export const Route = createFileRoute("/talent/")({
  validateSearch: (search: Record<string, unknown>): TalentSearch => ({
    cursor: typeof search.cursor === "string" && search.cursor ? search.cursor : undefined,
    q: typeof search.q === "string" && search.q ? search.q : undefined,
    skill: typeof search.skill === "string" && search.skill ? search.skill : undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const seo = await getSeoBase();
    try {
      const page = await listTalent({
        data: { cursor: deps.cursor, q: deps.q, skill: deps.skill, limit: 24 },
      });
      return { seo, page, restricted: false as const, query: deps.q ?? null };
    } catch (error) {
      if (isNotFound(error)) throw notFound();
      // `talent_directory_restricted` (403) — the board limits the directory to
      // employers; render the upsell, mirroring the hosted /talent restricted view.
      if (isForbidden(error)) {
        return { seo, page: null, restricted: true as const, query: null };
      }
      throw error;
    }
  },
  head: ({ loaderData }) =>
    loaderData
      ? {
          meta: [
            { title: m.talentDirectory_title() },
            {
              name: "description",
              content: m.talentDirectory_metaDescription({
                boardName: loaderData.seo.boardName,
              }),
            },
          ],
          links: [{ rel: "canonical", href: `${loaderData.seo.origin}/talent` }],
        }
      : { meta: [{ title: m.talentDirectory_title() }] },
  component: TalentDirectoryPage,
  notFoundComponent: () => (
    <p className="rounded-lg border border-dashed border-secondary p-10 text-center text-tertiary">
      {m.talentDirectory_notFoundText()}
    </p>
  ),
});

function TalentDirectoryPage() {
  const { seo, page, restricted, query } = Route.useLoaderData();
  const crumbs = boardCopy(seo.language, seo.labels).breadcrumbs;

  const jsonLd = [
    createBreadcrumbJsonLd([{ label: crumbs.home, href: seo.origin }, { label: crumbs.talent }]),
  ].filter((e): e is Record<string, unknown> => e !== null);

  return (
    <div className="space-y-6">
      <JsonLd data={jsonLd} />
      <Text as="h1" variant="heading1">
        {m.talentDirectory_title()}
      </Text>

      {restricted ? (
        <div className="border-secondary bg-primary rounded-xl border p-10 text-center shadow-xs">
          <p className="text-lg font-semibold">
            {m.talentDirectory_restrictedHeading()}
          </p>
          <p className="text-tertiary mt-1.5 text-sm">
            {m.talentDirectory_restrictedBody({ boardName: seo.boardName })}
          </p>
          <Button color="secondary" size="md" className="mt-4" href="/auth/sign-in">
            {m.talentDirectory_signInLabel()}
          </Button>
        </div>
      ) : (
        <>
          <form method="get" action="/talent" className="flex gap-2">
            <input
              type="search"
              name="q"
              defaultValue={query ?? undefined}
              placeholder={m.talentDirectory_searchPlaceholder()}
              className="border-secondary bg-primary focus-visible:border-primary flex-1 rounded-[10px] border px-3.5 py-2.5 text-sm outline-none"
            />
            <Button type="submit" color="secondary" size="md">
              {m.talentDirectory_searchLabel()}
            </Button>
          </form>

          {page.data.length === 0 ? (
            <p className="border-secondary text-tertiary rounded-xl border border-dashed p-10 text-center">
              {query ? m.talentDirectory_noMatchText({ query }) : m.talentDirectory_emptyText()}
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {page.data.map((candidate) => (
                <TalentCard key={candidate.handle ?? candidate.displayName} candidate={candidate} />
              ))}
            </div>
          )}

          {page.hasMore && page.nextCursor ? (
            <div className="flex justify-center">
              <Link
                from="/talent/"
                search={(prev) => ({
                  ...prev,
                  cursor: page.nextCursor ?? undefined,
                })}
                className={cx(
                  buttonStyles.common.root,
                  buttonStyles.sizes.md.root,
                  buttonStyles.colors.secondary.root,
                  "hover:no-underline",
                )}
              >
                {m.talentDirectory_loadMoreLabel()}
              </Link>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
