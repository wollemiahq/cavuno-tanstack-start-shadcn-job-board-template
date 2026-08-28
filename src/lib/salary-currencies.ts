/**
 * Currency options for the salary fields on the post-a-job form.
 *
 * This MIRRORS the hosted board's posting form, which drives its currency
 * list from per-board job-form config (`jobForm.salary.allowedCurrencies`)
 * and falls back to the full ISO 4217 set when the operator has not
 * narrowed it. `board.context().jobForm.salary.allowedCurrencies` now
 * carries that subset, so pass it in — the platform REJECTS a job priced in
 * a currency outside it (`JOBS_CONSTRAINT_VIOLATION` → 400).
 *
 * `null` (or an unrecognized list) means no restriction: the runtime ISO
 * 4217 list via `Intl.supportedValuesOf` (no new dependency), with the
 * most-used currencies front-loaded.
 */

/** Common currencies floated to the top of the list, in this order. */
const FRONT_LOADED = ['USD', 'EUR', 'GBP', 'AUD', 'CAD'];

export interface CurrencyOption {
  value: string;
  label: string;
}

export function salaryCurrencyOptions(
  allowedCurrencies?: readonly string[] | null,
): CurrencyOption[] {
  const all = Intl.supportedValuesOf('currency');
  const front = new Set(FRONT_LOADED);
  const tail = all.filter((code) => !front.has(code)).sort();
  const full = [...FRONT_LOADED, ...tail];
  // An allow-list of codes the runtime does not know would empty the picker
  // and block every posting; the server is the authority, so fall back to
  // the full list rather than render nothing.
  const allowed = allowedCurrencies?.length
    ? full.filter((code) => allowedCurrencies.includes(code))
    : full;
  const codes = allowed.length > 0 ? allowed : full;
  return codes.map((code) => ({
    value: code,
    label: code,
  }));
}
