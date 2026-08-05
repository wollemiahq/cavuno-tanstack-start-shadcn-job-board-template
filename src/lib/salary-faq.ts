/**
 * Compose salary FAQ Q&A from SDK structured entries + Paraglide catalog.
 *
 * `buildSalaryFaq` returns kinds + values only; the application owns the
 * sentences. Job-count wording uses `Intl.PluralRules` (real plural category)
 * to pick between One/Many Paraglide messages — not a `count === 1` check.
 * Prefer raw figures + `formatSalaryStatRange(…, 'standard')` when the compact
 * convenience range is null (Intl edge case).
 */
import {
  formatSalaryStatRange,
  type FaqItem,
  type SalaryFaqEntry,
} from '@cavuno/board/seo';

import { m } from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';

function jobCountLabel(jobCount: number): string {
  const category = new Intl.PluralRules(getLocale()).select(jobCount);
  return category === 'one'
    ? m.salaryFaq_jobCountOne({ jobCount })
    : m.salaryFaq_jobCountMany({ jobCount });
}

/**
 * Map SDK FAQ data entries to `{ q, a }` for `faqJsonLd` / the FAQ section.
 *
 * Locale note (deliberate): the numbers here format with `getLocale()` — the
 * CHROME locale — because they sit inside chrome-locale Paraglide sentences,
 * and a figure must agree with the sentence around it. The page headline
 * formats the same figure with the BOARD language instead; on a board whose
 * language differs from the viewer's chrome the two renderings differ by
 * design (agreement within a sentence beats uniformity across the page).
 */
export function composeSalaryFaqs(entries: SalaryFaqEntry[]): FaqItem[] {
  return entries.map((entry) => {
    if (entry.kind === 'average') {
      const range =
        formatSalaryStatRange(
          getLocale(),
          entry.avgMin,
          entry.avgMax,
          entry.currency,
          'standard',
        ) ??
        entry.range ??
        '';
      return {
        q: m.salaryFaq_averageQuestion({ label: entry.label }),
        a: m.salaryFaq_averageAnswer({
          label: entry.label,
          range,
          jobCountLabel: jobCountLabel(entry.jobCount),
        }),
      };
    }
    return {
      q: m.salaryFaq_methodologyQuestion({ label: entry.label }),
      a: m.salaryFaq_methodologyAnswer(),
    };
  });
}
