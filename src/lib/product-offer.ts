/**
 * The offer after a purchase (`Purchase.offer`), carried from the download
 * page to the offered product's page in history state, not the URL: the
 * token and the buyer's email never reach analytics, logs or a shared link.
 * A new tab or a pasted link opens the product page at its usual price.
 */
import type { Purchase } from '@cavuno/board';

export type ProductOffer = NonNullable<Purchase['offer']> & {
  /** The offer only applies at checkout with the email it was made for. */
  email: string;
};

declare module '@tanstack/react-router' {
  interface HistoryState {
    productOffer?: ProductOffer;
  }
}

/** The offer for this product page, if the buyer came from one. */
export function offerForProduct(
  offer: ProductOffer | undefined,
  productSlug: string,
): ProductOffer | null {
  return offer && offer.slug === productSlug ? offer : null;
}

/** Whole days, hours and minutes until `endsAt`, or null once it passed. */
export function timeLeft(
  endsAt: string,
  now: number,
): { days: number; hours: number; minutes: number } | null {
  const left = Date.parse(endsAt) - now;
  if (!(left > 0)) return null;
  const minutes = Math.ceil(left / 60_000);
  return {
    days: Math.floor(minutes / 1440),
    hours: Math.floor((minutes % 1440) / 60),
    minutes: minutes % 60,
  };
}
