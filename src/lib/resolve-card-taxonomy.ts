import { collectCardTaxonomyCandidates } from '@/board/job-view-model';
import { resolveTaxonomyChips } from '@/server/queries';
import type { PublicJobCard } from '@cavuno/board';

/**
 * Resolve the DEDUPED union of category/skill tag slugs across a page of job
 * cards to their canonical form, for `toJobCardVM`'s resolves-or-omits guard —
 * a card tag pill whose slug the taxonomy resolver rejects (facet/tag read-model
 * drift) would link to a `/jobs/:slug` that 404s.
 *
 * One batched `resolveTaxonomyChips` round trip per page (deduped first, so a
 * 20-card page resolves far fewer than 20×N slugs; the anonymous read-cache
 * gives each resolve a short edge TTL in production). Fails safe: a resolve
 * outage → `{}` (omit all pills, never a broken link). Returns `{}` immediately
 * when the page carries no tags, so an empty listing pays for no round trip.
 */
export async function resolveCardTaxonomy(
  jobs: readonly Pick<PublicJobCard, 'categories' | 'skills'>[],
): Promise<Record<string, string>> {
  const candidates = collectCardTaxonomyCandidates(jobs);
  if (candidates.length === 0) return {};
  return resolveTaxonomyChips({ data: { candidates } }).catch(
    () => ({}) as Record<string, string>,
  );
}
