/**
 * The ONE chrome-copy seam (ADR-0061 decision 7).
 *
 * Every route and component resolves chrome copy through this module —
 * never by calling a catalog inline. Content data (jobs, companies, blog,
 * taxonomy, salaries) is API-served and never flows through here.
 *
 * ADR-0063 D7 (the Paraglide step, done): copy resolves from the compiled
 * Paraglide messages keyed by the RUNTIME locale (`getLocale()` — the URL
 * locale under the `/de/`-style chrome prefixes), overlaid with the
 * board's operator label overrides. The `language` parameter callers
 * thread is retained for the block prop contract but no longer selects
 * the catalog: `baseLocale === board.language` is a generation-time
 * invariant (project.inlang/settings.json is emitted per board), so the
 * unprefixed site renders the board language and prefixed locales follow
 * the URL.
 *
 * Builder-2's layer-3 ejection (ADR-0059: per-board generated-code copy
 * overrides) is a regeneration of `messages/{locale}.json` + this file.
 */
import { m } from '@/paraglide/messages';

import type { BoardLabelOverrides, UiCopy } from '@cavuno/board/format';

export type BoardCopy = UiCopy;
export type { BoardLabelOverrides };

type MessageFn = (inputs?: Record<string, unknown>) => string;

/**
 * The two parameterized catalog keys (positional callers) → their ICU
 * input name. Mirrors PARAM_KEYS in scripts/gen-paraglide-messages.mjs.
 */
const PARAM_KEYS: Record<string, string> = {
  jobDetail_experienceYears: 'years',
  jobDetail_posted: 'date',
};

/**
 * Catalog keys that are `{{token}}` TEMPLATES on the UiCopy contract
 * (callers resolve them at render, same as the hosted board and stored
 * operator overrides). The gen script emits their tokens as ICU inputs
 * (`{year}`), so feeding the mustache text back in as each input's value
 * reconstructs the verbatim template string in the active locale.
 */
const TEMPLATE_KEYS: Record<string, string[]> = {
  footer_copyrightPrefix: ['year', 'board_name'],
  footer_defaultDescription: ['board_name'],
};

/**
 * Catalog group → the stored config group its operator overrides live in.
 * Mirrors GROUP_OVERRIDE_SOURCE in @cavuno/board `format/ui-copy.ts` (not
 * exported there): the detail/apply/alerts/copy-link groups all read the
 * hosted `jobCardLabels` grab-bag — a fact of the hosted data model.
 */
const GROUP_OVERRIDE_SOURCE: Record<string, keyof BoardLabelOverrides> = {
  jobCard: 'jobCardLabels',
  jobSearch: 'jobSearchLabels',
  jobDetail: 'jobCardLabels',
  apply: 'jobCardLabels',
  alerts: 'jobCardLabels',
  copyLink: 'jobCardLabels',
  salary: 'salaryLabels',
  nav: 'navLabels',
  footer: 'footerLabels',
  breadcrumbs: 'breadcrumbsLabels',
  pagination: 'globalPaginationLabels',
  blog: 'blogSharedLabels',
  entity: 'entityLabels',
};

export function boardCopy(
  _language: string | undefined,
  labels?: BoardLabelOverrides,
): BoardCopy {
  const copy: Record<string, Record<string, unknown>> = {};
  for (const [flatKey, message] of Object.entries(m)) {
    const split = flatKey.indexOf('_');
    const group = flatKey.slice(0, split);
    const key = flatKey.slice(split + 1);
    const param = PARAM_KEYS[flatKey];
    const templateTokens = TEMPLATE_KEYS[flatKey];
    (copy[group] ??= {})[key] = param
      ? (value: unknown) => (message as MessageFn)({ [param]: value })
      : templateTokens
        ? (message as MessageFn)(
            Object.fromEntries(
              templateTokens.map((token) => [token, `{{${token}}}`]),
            ),
          )
        : (message as MessageFn)();
  }
  if (labels) {
    for (const [group, values] of Object.entries(copy)) {
      const overrides = labels[GROUP_OVERRIDE_SOURCE[group]!];
      if (!overrides) continue;
      for (const [key, value] of Object.entries(values)) {
        const override = overrides[key];
        if (
          typeof value === 'string' &&
          typeof override === 'string' &&
          override.trim() !== ''
        ) {
          values[key] = override;
        }
      }
    }
  }
  return copy as unknown as BoardCopy;
}
