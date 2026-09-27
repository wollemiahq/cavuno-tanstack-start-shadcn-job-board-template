/**
 * Location display labels for job cards and detail pages — formerly
 * `@cavuno/board/format` `locationLabel` / `cardLocationLabel`.
 *
 * Place names arrive already localized from the wire. Workplace wrapper
 * words come from the canonical enum vocabulary.
 */
import { countryOptions } from '@cavuno/board/format';

import { m } from '../paraglide/messages';
import { isLocale } from '../paraglide/runtime';
import { enumLabel } from './enum-labels';

export interface LocationLabelJob {
  remoteOption: string | null;
  remoteWorldwide?: boolean | null;
  officeLocations: Array<{
    displayName?: string | null;
    city?: string | null;
    locality?: string | null;
    region?: string | null;
    country?: string | null;
    countryCode?: string | null;
  }>;
}

export interface CardLocationLabelJob {
  remoteOption: string | null;
  remoteLocationLabel?: string | null;
  /** 4.1.0 structured twin of the label's "Worldwide" case. */
  remoteWorldwide?: boolean | null;
  /** 4.1.0 derived permit expansion (ISO 3166-1 alpha-2). */
  remoteWorkPermitCountryCodes?: string[];
  locationLabel?: string | null;
  /** ISO alpha-2 code for the country represented by locationLabel. */
  locationCountryCode?: string | null;
}

/**
 * Worldwide-ness of a remote card. Prefers the 4.1.0 structured boolean;
 * falls back to the English sentinel only when the API predates the field
 * (a non-English board's label never matches the sentinel — exactly why
 * the boolean exists).
 */
export function isWorldwideRemote(job: CardLocationLabelJob): boolean {
  if (job.remoteOption !== 'remote') return false;
  return job.remoteWorldwide ?? job.remoteLocationLabel === 'Worldwide';
}

const ISO_COUNTRY_CODES = new Set<string>(
  countryOptions('en').map((country) => country.code),
);
const COUNTRY_CODE_ALIASES = new Map<string, string>([['UK', 'GB']]);

/** Resolve an ISO 3166-1 alpha-2 code in the viewer's locale. */
export function localizedCountryName(
  code: string | null | undefined,
  language?: string,
): string | null {
  const normalized = code?.trim().toUpperCase();
  if (!normalized || !ISO_COUNTRY_CODES.has(normalized)) return null;

  const tag = language && language.length > 0 ? language : undefined;
  try {
    return (
      new Intl.DisplayNames(tag ? [tag] : undefined, { type: 'region' }).of(
        normalized,
      ) ?? null
    );
  } catch {
    return null;
  }
}

/** Localize the structured country represented by an otherwise opaque label. */
export function localizedLocationLabel(
  label: string | null | undefined,
  countryCode: string | null | undefined,
  language?: string,
  sourceLanguage: string | undefined = language,
  countryAliases: Array<string | null | undefined> = [],
): string | null {
  if (!label) return null;
  const normalizedCode = countryCode?.trim().toUpperCase();
  const country = localizedCountryName(normalizedCode, language);
  if (!normalizedCode || !country) return label;

  const suffix = label.match(/(^|,\s*)([^,]+?)\s*$/);
  const suffixCountry = suffix?.[2].trim().toLocaleLowerCase();
  const matchesCountry = [
    normalizedCode,
    ...[...COUNTRY_CODE_ALIASES.entries()]
      .filter(([, canonical]) => canonical === normalizedCode)
      .map(([alias]) => alias),
    localizedCountryName(normalizedCode, sourceLanguage),
    country,
    ...countryAliases,
  ].some(
    (candidate) => candidate?.trim().toLocaleLowerCase() === suffixCountry,
  );

  if (suffix && suffix.index !== undefined && matchesCountry) {
    return `${label.slice(0, suffix.index)}${suffix[1]}${country}`;
  }
  return `${label}, ${country}`;
}

export function localizedOfficeLocationLabel(
  office: LocationLabelJob['officeLocations'][number],
  language?: string,
  sourceLanguage: string | undefined = language,
): string | null {
  const displayName = office.displayName?.trim();
  const countryCode = office.countryCode?.trim().toUpperCase();
  const rawLabel =
    displayName ||
    [
      office.city ?? office.locality,
      office.region,
      countryCode ?? office.country,
    ]
      .filter(Boolean)
      .join(', ');
  return localizedLocationLabel(
    rawLabel || null,
    countryCode,
    language,
    sourceLanguage,
    [office.country],
  );
}

/**
 * Viewer-locale region wording for a CONSTRAINED remote card. Up to three
 * permit countries word via `Intl.DisplayNames` + `Intl.ListFormat` in the
 * viewer's locale; longer lists (typically region/continent authored
 * selections) keep the wire label, whose grouping the codes can't recover.
 */
export function localizedRemoteRegion(
  job: CardLocationLabelJob,
  language?: string,
): string | null {
  const codes = job.remoteWorkPermitCountryCodes ?? [];
  if (codes.length >= 1 && codes.length <= 3) {
    // Board language drives Intl even when that language is not a compiled
    // chrome locale (English-only default). Paraglide catalogs are separate.
    const tag = language && language.length > 0 ? language : undefined;
    try {
      const displayNames = new Intl.DisplayNames(tag ? [tag] : undefined, {
        type: 'region',
      });
      const names = codes.map((code) => displayNames.of(code) ?? code);
      return new Intl.ListFormat(tag ? [tag] : undefined, {
        style: 'long',
        type: 'conjunction',
      }).format(names);
    } catch {
      // Unknown code shapes fall through to the wire label.
    }
  }
  return job.remoteLocationLabel ?? null;
}

/**
 * Location label for the full job (detail pages, embedded saved jobs):
 * first office location's display name, remote/hybrid wrapping per
 * `remoteOption`.
 */
export function locationLabel(
  job: LocationLabelJob,
  language?: string,
): string {
  const office = job.officeLocations[0];
  const place = office ? localizedOfficeLocationLabel(office, language) : null;
  // Callers outside a request's chrome context (the OG image renderer)
  // pass the board language explicitly; everyone else keeps the ambient
  // Paraglide locale.
  const locale = isLocale(language) ? { locale: language } : undefined;

  if (job.remoteOption === 'remote') {
    return job.remoteWorldwide
      ? m.label_locationRemoteWorldwide({}, locale)
      : (enumLabel('remote', language) ?? '');
  }
  if (!place) return enumLabel(job.remoteOption, language) ?? '';
  return job.remoteOption === 'hybrid'
    ? m.label_locationHybrid({ place }, locale)
    : place;
}

/**
 * Location label for a list CARD. The card read-model pre-computes
 * `locationLabel` and (for remote jobs) `remoteLocationLabel` server-side —
 * the slim card carries no `officeLocations`/`remoteWorldwide` — so those
 * wire fields are used directly.
 */
export function cardLocationLabel(
  job: CardLocationLabelJob,
  language?: string,
  sourceLanguage: string | undefined = language,
): string {
  const locale = isLocale(language) ? { locale: language } : undefined;
  if (job.remoteOption === 'remote') {
    if (isWorldwideRemote(job)) {
      return m.label_locationRemoteWorldwide({}, locale);
    }
    const region = localizedRemoteRegion(job, language);
    return region
      ? m.label_locationRemoteIn({ region }, locale)
      : (enumLabel('remote', language) ?? '');
  }
  return (
    localizedLocationLabel(
      job.locationLabel,
      job.locationCountryCode,
      language,
      sourceLanguage,
    ) ??
    enumLabel(job.remoteOption) ??
    ''
  );
}
