/**
 * Currency options for the salary fields on the post-a-job form.
 *
 * This MIRRORS the hosted board's posting form, which drives its currency
 * list from per-board job-form config (`jobForm.salary.allowedCurrencies`)
 * and falls back to the full ISO 4217 set when the operator has not
 * narrowed it. The v1 Board API defines `JobFormConfig` in its OpenAPI
 * schema but exposes it through no endpoint yet, so the template cannot
 * read a board's allowed list today.
 *
 * MUST be replaced by the board's `jobForm.salary.allowedCurrencies` once
 * the v1 API surfaces `JobFormConfig` (platform ticket pending). Until
 * then this returns the runtime ISO 4217 list via `Intl.supportedValuesOf`
 * (no new dependency), with the most-used currencies front-loaded.
 */

/** Common currencies floated to the top of the list, in this order. */
const FRONT_LOADED = ['USD', 'EUR', 'GBP', 'AUD', 'CAD'];

export interface CurrencyOption {
  value: string;
  label: string;
}

export function salaryCurrencyOptions(): CurrencyOption[] {
  const all = Intl.supportedValuesOf('currency');
  const front = new Set(FRONT_LOADED);
  const tail = all.filter((code) => !front.has(code)).sort();
  return [...FRONT_LOADED, ...tail].map((code) => ({
    value: code,
    label: code,
  }));
}
