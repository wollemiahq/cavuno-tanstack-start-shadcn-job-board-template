import impressum from './impressum.json';

import type { LegalPageData } from './types';

const page: LegalPageData = impressum;

/**
 * The impressum is published only when the board enables it AND the operator
 * has written one. The starter never ships impressum text, because its facts
 * (registered address, register entry, VAT ID) can only come from the
 * operator. Translations are made from the source entry, so the source entry
 * decides.
 *
 * Kept apart from `./index` so the footer does not bundle every legal page.
 */
export function impressumAvailable(features: { impressum: boolean }): boolean {
  return features.impressum && page.locales[page.sourceLanguage] !== undefined;
}
