import { describe, expect, it } from 'vitest';

import { productButtonText } from './product-ui';

import { m } from '@/paraglide/messages';

describe('productButtonText', () => {
  const paid = { kind: 'fixed' as const };

  it('words each dashboard preset key', () => {
    expect(
      ['i_want_this', 'buy_this', 'pay', 'get_this', 'download'].map(
        (buttonLabel) => productButtonText({ buttonLabel, price: paid }),
      ),
    ).toEqual([
      m.product_iWantThisAction(),
      m.product_buyThisAction(),
      m.product_payAction(),
      m.product_getThisAction(),
      m.product_downloadAction(),
    ]);
  });

  it('falls back to Buy, or Get it free on a free product', () => {
    expect(productButtonText({ buttonLabel: null, price: paid })).toBe(
      m.product_buyAction(),
    );
    expect(
      productButtonText({ buttonLabel: null, price: { kind: 'free' } }),
    ).toBe(m.product_getFreeAction());
  });
});
