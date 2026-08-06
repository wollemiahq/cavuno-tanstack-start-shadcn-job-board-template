/**
 * Location display labels for job cards and detail pages — formerly
 * `@cavuno/board/format` `locationLabel` / `cardLocationLabel`.
 *
 * Place names arrive already localized from the wire. Workplace wrapper
 * words come from the canonical enum vocabulary.
 */
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
    country?: string | null;
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
    const tag = isLocale(language) ? language : undefined;
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
  const place = office
    ? (office.displayName ??
      [office.city ?? office.locality, office.country]
        .filter(Boolean)
        .join(', '))
    : null;
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
  return job.locationLabel ?? enumLabel(job.remoteOption) ?? '';
}
