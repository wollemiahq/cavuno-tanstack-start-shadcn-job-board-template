/**
 * The `/memberships` loader, deliberately apart from the view: TanStack splits
 * the route component but keeps loaders in the critical graph, so importing the
 * loader from the view module would pull the whole page (cards, roster, plan
 * copy) into the shared shell on every route.
 */
import type { getMembershipsPage } from '@/server/membership-pages';

/** What the loader hands the page — the server fn's resolved payload. */
export type MembershipsPageData = Awaited<
  ReturnType<typeof getMembershipsPage>
>;

export type MembershipsLoaderDependencies = {
  getMembershipsPage: () => Promise<MembershipsPageData>;
};

/**
 * A board with no published membership plan has no memberships page at all, so
 * the caller turns an empty plan list into the starter's standard not-found
 * rather than rendering an empty shell.
 */
export function createMembershipsLoader(
  dependencies: MembershipsLoaderDependencies,
  onEmpty: () => never,
) {
  return async () => {
    const page = await dependencies.getMembershipsPage();
    if (page.plans.length === 0 || page.head === null) onEmpty();
    return page;
  };
}
