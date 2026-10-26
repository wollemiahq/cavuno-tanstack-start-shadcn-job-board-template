/**
 * Display values for digital products: prices, file sizes, file-type chips
 * and star ratings. Pure functions over the Board API wire shapes so the
 * listing, product page, download page and library word them the same way.
 */
import type { ProductPrice } from '@cavuno/board';

export function formatMoney(
  locale: string,
  amountCents: number,
  currency: string,
): string {
  const whole = amountCents % 100 === 0;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amountCents / 100);
}

/** Exact amount with cents, for receipts and order summaries. */
export function formatMoneyExact(
  locale: string,
  amountCents: number,
  currency: string,
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
}

export type PriceLabel =
  | { kind: 'free' }
  | { kind: 'fixed'; amount: string }
  /** "$5+": the minimum a buyer may pay. */
  | { kind: 'pay_what_you_want'; minimum: string; suggested: string | null };

export function priceLabel(price: ProductPrice, locale: string): PriceLabel {
  if (price.kind === 'free' || !price.currency) return { kind: 'free' };
  if (price.kind === 'fixed') {
    return {
      kind: 'fixed',
      amount: formatMoney(locale, price.amountCents, price.currency),
    };
  }
  const minimumCents = price.minimumCents ?? price.amountCents;
  return {
    kind: 'pay_what_you_want',
    minimum: formatMoney(locale, minimumCents, price.currency),
    suggested:
      price.suggestedCents != null
        ? formatMoney(locale, price.suggestedCents, price.currency)
        : null,
  };
}

/** The minimum a pay-what-you-want buyer may pay, in cents. */
export function minimumAmountCents(price: ProductPrice): number {
  return price.kind === 'pay_what_you_want'
    ? (price.minimumCents ?? price.amountCents)
    : price.amountCents;
}

/** Whole currency units the buyer typed ("12", "12.50", "12,50") → cents. */
export function parseAmountCents(input: string): number | null {
  const normalized = input.trim().replace(/\s/g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 100);
}

/** `12.4 MB` in the viewer's locale; null when the size is unknown. */
export function formatFileSize(
  locale: string,
  bytes: number | null | undefined,
): string | null {
  if (bytes == null) return null;
  const units = [
    ['gigabyte', 1e9],
    ['megabyte', 1e6],
    ['kilobyte', 1e3],
  ] as const;
  for (const [unit, size] of units) {
    if (bytes >= size) {
      return new Intl.NumberFormat(locale, {
        style: 'unit',
        unit,
        maximumFractionDigits: bytes >= size * 10 ? 0 : 1,
      }).format(bytes / size);
    }
  }
  // Under 1 kB still reads as a size people recognise (`0.1 kB`).
  return new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: 'kilobyte',
    maximumFractionDigits: 1,
  }).format(Math.max(bytes, 100) / 1e3);
}

/**
 * `['pdf', 'csv', 'link']` → `['PDF', 'CSV']`: the file-type chips. Links
 * are counted separately (`facts.linkCount`), so `link` is left out here.
 */
export function fileTypeLabels(fileTypes: readonly string[]): string[] {
  return [
    ...new Set(
      fileTypes
        .filter((fileType) => fileType !== 'link')
        .map((fileType) => fileType.toUpperCase()),
    ),
  ];
}

/** The short badge for a download row from its content type or name. */
export function fileBadge(
  displayName: string,
  contentType: string | null,
): string {
  const extension = /\.([a-z0-9]{1,5})$/i.exec(displayName)?.[1];
  if (extension) return extension.toUpperCase();
  const subtype = contentType?.split('/')[1]?.split(/[+;.-]/)[0];
  return subtype ? subtype.slice(0, 4).toUpperCase() : 'FILE';
}

/** One decimal place, as the stars read ("4.8"). */
export function formatRating(locale: string, average: number): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(average);
}
