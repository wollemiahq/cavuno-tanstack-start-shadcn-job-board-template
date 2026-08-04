/**
 * Location display labels for job cards and detail pages — formerly
 * `@cavuno/board/format` `locationLabel` / `cardLocationLabel`.
 *
 * Place names arrive already localized from the wire. Workplace wrapper
 * words come from the canonical enum vocabulary.
 */
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
export function locationLabel(job: LocationLabelJob): string {
  const office = job.officeLocations[0];
  const place = office
    ? (office.displayName ??
      [office.city ?? office.locality, office.country]
        .filter(Boolean)
        .join(', '))
    : null;

  if (job.remoteOption === 'remote') {
    return job.remoteWorldwide ? 'Remote (worldwide)' : 'Remote';
  }
  if (!place) return enumLabel(job.remoteOption) ?? '';
  return job.remoteOption === 'hybrid' ? `${place} (hybrid)` : place;
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
      ? `Remote · ${job.remoteLocationLabel}`
      : 'Remote';
  }
  return job.locationLabel ?? enumLabel(job.remoteOption) ?? '';
}
