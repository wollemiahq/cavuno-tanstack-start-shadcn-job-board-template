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
  locationLabel?: string | null;
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
export function cardLocationLabel(job: CardLocationLabelJob): string {
  if (job.remoteOption === 'remote') {
    return job.remoteLocationLabel
      ? m.label_locationRemoteIn({ region: job.remoteLocationLabel })
      : (enumLabel('remote') ?? '');
  }
  return job.locationLabel ?? enumLabel(job.remoteOption) ?? '';
}
