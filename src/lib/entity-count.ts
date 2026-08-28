/**
 * "{count} {noun}", with the noun in the CLDR plural form the count requires.
 *
 * Two paths, because the noun has two possible sources.
 *
 * A board that has NOT renamed the entity resolves a real plural message, so
 * a locale with more than two forms is grammatical: Polish needs "5 ofert"
 * (genitive), not "5 oferty", and `Intl.PluralRules.select(5)` returns `many`
 * where `select(2)` returns `few`.
 *
 * A board whose operator renamed the entity in `chrome.json` supplies only two
 * bare nouns, so that path can only ever render one-vs-rest. Widening it would
 * mean asking operators for four forms per noun; renaming is rare and
 * operator-chosen, while the catalog path is what the untouched fleet renders.
 */
export function entityCount(
  count: number,
  locale: string,
  message: (args: { count: number; countLabel: string }) => string,
  override?: { singular?: string; plural?: string },
): string {
  const countLabel = count.toLocaleString(locale);
  const singular = override?.singular;
  const plural = override?.plural;
  if (singular !== undefined && plural !== undefined) {
    return `${countLabel} ${
      new Intl.PluralRules(locale).select(count) === 'one' ? singular : plural
    }`;
  }
  return message({ count, countLabel });
}
