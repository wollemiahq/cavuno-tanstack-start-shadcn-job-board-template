/**
 * The Apply gateway capability, declared on every job read the board client
 * makes.
 *
 * Without `apply-gateway-v1`, the Board API leaves Sponsored jobs
 * (`isSponsored: true`) out of every job list and answers their detail read
 * with 404. This starter only ever applies to a Sponsored job through the
 * gateway: job cards carry no Apply URL, the detail read redacts it, and
 * Apply goes through `/apply`, which creates an opaque apply intent. So the
 * client declares the capability on each read that can return one:
 *
 * - The cacheable GETs (`jobs.list`, `jobs.retrieve`, `jobs.similar`,
 *   `companies.listJobs` and `embed.jobs`) send it as the `capabilities`
 *   query parameter. The opt-in is part of the URL, so the response stays
 *   shared-cacheable at the edge. The header form would share a URL-keyed
 *   cache entry with legacy readers, so `applyReadCache` never caches it.
 * - `jobs.search` (POST) and `me.recommendedJobs.list` (signed in) take no
 *   query form. They send the `x-cavuno-board-capabilities` header; neither
 *   is cached anyway.
 *
 * Declaring it once on the client, rather than at each call site, means a
 * new job read cannot silently drop the board's Sponsored jobs.
 */
import type { BoardSdk, FetchOptions, JobCapability } from '@cavuno/board';

export const APPLY_GATEWAY_CAPABILITY_HEADER = 'x-cavuno-board-capabilities';
export const APPLY_GATEWAY_CAPABILITY = 'apply-gateway-v1' as const;

/** A query that already carries the capability keeps it; no duplicate. */
function withCapabilityQuery<Q extends { capabilities?: JobCapability[] }>(
  query: Q | undefined,
): Q | { capabilities: JobCapability[] } {
  if (!query) return { capabilities: [APPLY_GATEWAY_CAPABILITY] };
  const capabilities = query.capabilities ?? [];
  if (capabilities.includes(APPLY_GATEWAY_CAPABILITY)) return query;
  return {
    ...query,
    capabilities: [...capabilities, APPLY_GATEWAY_CAPABILITY],
  };
}

function withCapabilityHeader(options: FetchOptions | undefined): FetchOptions {
  const headers = new Headers(options?.headers);
  headers.set(APPLY_GATEWAY_CAPABILITY_HEADER, APPLY_GATEWAY_CAPABILITY);
  return { ...options, headers: Object.fromEntries(headers) };
}

/**
 * A view of `board` whose job reads declare the capability. Namespace methods
 * close over the client (no `this`), so the view shares the client and
 * everything else unchanged.
 */
export function withApplyGatewayReads(board: BoardSdk): BoardSdk {
  const { jobs, companies, embed, me } = board;
  return {
    ...board,
    jobs: {
      ...jobs,
      list: (query, options) => jobs.list(withCapabilityQuery(query), options),
      retrieve: (jobSlug, query, options) =>
        jobs.retrieve(jobSlug, withCapabilityQuery(query), options),
      similar: (jobSlug, query, options) =>
        jobs.similar(jobSlug, withCapabilityQuery(query), options),
      search: (body, query, options) =>
        jobs.search(body, query, withCapabilityHeader(options)),
    },
    companies: {
      ...companies,
      listJobs: (companySlug, query, options) =>
        companies.listJobs(companySlug, withCapabilityQuery(query), options),
    },
    embed: {
      ...embed,
      jobs: (query, options) => embed.jobs(withCapabilityQuery(query), options),
    },
    me: {
      ...me,
      recommendedJobs: {
        ...me.recommendedJobs,
        list: (query, options) =>
          me.recommendedJobs.list(query, withCapabilityHeader(options)),
      },
    },
  };
}
