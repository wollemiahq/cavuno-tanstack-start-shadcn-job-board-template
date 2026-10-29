/**
 * Digital product errors (checkout and the download page) → viewer-locale
 * copy. Kept out of the shared `CODE_MESSAGES` (`board-error-message.ts`):
 * that map ships with every route that shows a Board API error, and only
 * the product, purchase and resend surfaces can raise these codes. Any other
 * code falls through to `boardErrorMessage`.
 */
import { m } from '../paraglide/messages';
import { boardErrorMessage } from './board-error-message';

export const PRODUCT_CODE_MESSAGES = {
  product_sold_out: m.boardError_productSoldOutText,
  product_email_invalid: m.boardError_productEmailInvalidText,
  product_email_blocked: m.boardError_productEmailBlockedText,
  product_amount_below_minimum: m.boardError_productAmountBelowMinimumText,
  product_amount_invalid: m.boardError_productAmountInvalidText,
  product_answers_invalid: m.boardError_productAnswersInvalidText,
  purchase_email_mismatch: m.boardError_purchaseEmailMismatchText,
  purchase_file_preparing: m.boardError_purchaseFilePreparingText,
  purchase_download_limit_reached: m.boardError_purchaseDownloadLimitText,
  purchase_review_invalid: m.boardError_purchaseReviewInvalidText,
  purchase_download_all_unavailable: m.boardError_purchaseDownloadAllText,
  purchase_refunded: m.boardError_purchaseRefundedText,
};

export function productErrorMessage(result: {
  code?: string | null;
  message?: string | null;
}): string {
  const code = result.code;
  if (
    code &&
    Object.prototype.hasOwnProperty.call(PRODUCT_CODE_MESSAGES, code)
  ) {
    // SAFETY: the hasOwnProperty check proves code is a key of the map.
    return PRODUCT_CODE_MESSAGES[code as keyof typeof PRODUCT_CODE_MESSAGES]();
  }
  return boardErrorMessage(result);
}
