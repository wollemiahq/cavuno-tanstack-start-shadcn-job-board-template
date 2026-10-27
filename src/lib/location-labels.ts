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
  /** 4.54.0 authored remote scopes, in the employer's order. */
  remotePermits?: ReadonlyArray<RemotePermit>;
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

/** One authored remote scope from the card's `remotePermits`. */
export interface RemotePermit {
  type: string;
  value: string;
  /** UN M.49 area code on continent/region/subregion entries that have one. */
  code?: string;
}

/**
 * `Intl.DisplayNames` region name for an ISO 3166-1 alpha-2 or UN M.49 code,
 * or `null` when the runtime cannot name it (it echoes the code back).
 */
function regionName(names: Intl.DisplayNames, code: string): string | null {
  try {
    const upper = code.toUpperCase();
    const name = names.of(upper);
    return name && name !== upper ? name : null;
  } catch {
    return null;
  }
}

/**
 * Board-language remote scope for a card, built from `remotePermits` with the
 * same composition rules as the API's English `remoteLocationLabel`:
 * any `worldwide` entry → the worldwide word; one entry → its name; only
 * world regions and at most two → joined with ", "; otherwise
 * "{first} + {count} more".
 *
 * A `country` is named from its ISO code and an area from its M.49 `code`
 * via `Intl.DisplayNames`; a `world_region` keeps its acronym ("EMEA").
 * Entries with no language-neutral name (`subdivision`, `custom`, an area
 * without a code) return `null` so the caller uses the API label whole,
 * never a label that mixes languages.
 */
export function remotePermitsLabel(
  permits: ReadonlyArray<RemotePermit>,
  language?: string,
): string | null {
  if (permits.length === 0) return null;
  const locale = isLocale(language) ? { locale: language } : undefined;
  if (permits.some((permit) => permit.type === 'worldwide')) {
    return m.jobDetail_worldwideLabel({}, locale);
  }
  let names: Intl.DisplayNames;
  try {
    // Board language drives Intl even when that language is not a compiled
    // chrome locale. Paraglide catalogs are separate.
    names = new Intl.DisplayNames(language ? [language] : undefined, {
      type: 'region',
    });
  } catch {
    return null;
  }
  const named: string[] = [];
  for (const permit of permits) {
    const name =
      permit.type === 'world_region'
        ? permit.value || null
        : permit.type === 'country'
          ? regionName(names, permit.value)
          : permit.code
            ? regionName(names, permit.code)
            : null;
    if (!name) return null;
    named.push(name);
  }
  if (named.length === 1) return named[0]!;
  if (
    named.length <= 2 &&
    permits.every((permit) => permit.type === 'world_region')
  ) {
    return named.join(', ');
  }
  // Up to three countries read as a list ("Deutschland, Spanien und Polen"),
  // as the card did before it had `remotePermits`.
  if (
    named.length <= 3 &&
    permits.every((permit) => permit.type === 'country')
  ) {
    try {
      return new Intl.ListFormat(language ? [language] : undefined, {
        style: 'long',
        type: 'conjunction',
      }).format(named);
    } catch {
      // Fall through to the "+ N more" wording.
    }
  }
  // The "+ N more" wording comes from the chrome catalog; on a board language
  // with no compiled catalog it would be English around localized names, so
  // keep the API's label whole instead.
  if (!locale) return null;
  return m.label_locationRemoteFirstAndMore(
    { first: named[0]!, count: named.length - 1 },
    locale,
  );
}

/**
 * Board-language region wording for a CONSTRAINED remote card: the
 * `remotePermits` label, else the API's `remoteLocationLabel`.
 */
export function localizedRemoteRegion(
  job: CardLocationLabelJob,
  language?: string,
): string | null {
  return (
    remotePermitsLabel(job.remotePermits ?? [], language) ??
    job.remoteLocationLabel ??
    null
  );
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
