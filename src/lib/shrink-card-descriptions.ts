/**
 * Replace each card's full description HTML with the one-line summary the
 * card actually renders, before the list is serialized to the client.
 *
 * `/jobs` and the home rail request `fields: '+description'` purely so the
 * card can show `deriveSummary(job.description)` — a single sentence. The
 * full description HTML was then dehydrated into the document as well:
 * measured at ~11KB of unused markup on one `/jobs` render with the
 * sandbox's short descriptions, and proportionally worse on a real board
 * (3-8KB per job is normal).
 *
 * `deriveSummary` is a pure string function whose output is a plain,
 * single-sentence string, so re-running it on that string in the view model
 * returns the same value — the card renders identically while the payload
 * carries a sentence instead of a document.
 *
 * NOTE this does not remove the UPSTREAM cost of asking for descriptions;
 * that is a product call about whether these two surfaces show summaries at
 * all (the taxonomy listing pages already do not).
 */
import { deriveSummary } from './derive-summary';

interface CardWithDescription {
  description?: string | null;
}

export function shrinkCardDescriptions<
  T extends { data: readonly CardWithDescription[] },
>(list: T): T {
  return {
    ...list,
    data: list.data.map((card) =>
      card.description == null
        ? card
        : { ...card, description: deriveSummary(card.description) },
    ),
  };
}
