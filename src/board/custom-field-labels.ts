/**
 * Template-side custom-field localization — the half of the wire contract
 * this app owns. `CustomFieldDefinition.label` is documented as the
 * "authoring-default label; the localized public string lives in the board
 * template", and stored values are stable option KEYS, never labels. Map
 * your board's field keys (and select option keys) to catalog messages
 * here; anything unmapped falls back to the wire's authoring-default label,
 * so new fields degrade gracefully until they are added.
 */
import { m } from '../paraglide/messages';
import { isLocale, type Locale } from '../paraglide/runtime';

type MessageFn = (
  inputs?: Record<string, never>,
  options?: { locale?: Locale },
) => string;

interface CustomFieldLabelEntry {
  label: MessageFn;
  options?: Map<string, MessageFn>;
}

const FIELD_LABELS = new Map<string, CustomFieldLabelEntry>([
  [
    'visa_sponsorship',
    {
      label: m.customField_visaSponsorship_label,
      options: new Map([
        ['yes', m.customField_visaSponsorship_optionYes],
        ['no', m.customField_visaSponsorship_optionNo],
        ['case_by_case', m.customField_visaSponsorship_optionCaseByCase],
      ]),
    },
  ],
  ['team_page_url', { label: m.customField_teamPageUrl_label }],
  [
    'relocation_assistance',
    { label: m.customField_relocationAssistance_label },
  ],
]);

function localeOpt(language?: string) {
  return isLocale(language) ? { locale: language } : undefined;
}

/** Localized label for a custom field; wire authoring default as fallback. */
export function customFieldLabel(
  field: { key: string; label: string },
  language?: string,
): string {
  const entry = FIELD_LABELS.get(field.key);
  return entry ? entry.label({}, localeOpt(language)) : field.label;
}

/** Localized label for a select option; wire authoring default as fallback. */
export function customFieldOptionLabel(
  fieldKey: string,
  option: { key: string; label: string },
  language?: string,
): string {
  const message = FIELD_LABELS.get(fieldKey)?.options?.get(option.key);
  return message ? message({}, localeOpt(language)) : option.label;
}
