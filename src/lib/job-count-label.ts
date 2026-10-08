import { m } from '../paraglide/messages';
import { isLocale } from '../paraglide/runtime';

/**
 * A job count formatted for `locale`; a capped count (see
 * `isRelevanceCountCapped`) reads as a lower bound, such as "1,000+".
 */
export function jobCountLabel(
  count: number,
  locale: string,
  capped = false,
): string {
  const formatted = new Intl.NumberFormat(locale).format(count);
  if (!capped) return formatted;
  return m.jobSearch_cappedCountLabel(
    { count: formatted },
    isLocale(locale) ? { locale } : undefined,
  );
}
