import { BOARD_API_ERROR_CODES } from '@cavuno/board';
import { describe, expect, it } from 'vitest';

import { m } from '../paraglide/messages';
import { CODE_MESSAGES } from './board-error-message';
import {
  PRODUCT_CODE_MESSAGES,
  productErrorMessage,
} from './product-error-message';

describe('digital product error code map', () => {
  it('every mapped key is a real SDK code, and none is also in the shared map', () => {
    const known = new Set<string>(BOARD_API_ERROR_CODES);
    const keys = Object.keys(PRODUCT_CODE_MESSAGES);
    expect(keys.filter((key) => !known.has(key))).toEqual([]);
    expect(keys.filter((key) => key in CODE_MESSAGES)).toEqual([]);
  });

  it('resolves a product code to its copy and falls back to the shared map', () => {
    expect(
      productErrorMessage({ code: 'purchase_download_all_unavailable' }),
    ).toBe(m.boardError_purchaseDownloadAllText());
    expect(productErrorMessage({ code: 'rate_limited' })).toBe(
      m.boardError_rateLimitedText(),
    );
  });
});
