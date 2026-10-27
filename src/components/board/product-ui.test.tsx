import { describe, expect, it } from 'vitest';

import { productButtonText } from './product-ui';

import { m } from '@/paraglide/messages';

describe('productButtonText', () => {
  it('says Buy now on a paid product', () => {
    expect(productButtonText({ price: { kind: 'fixed' } })).toBe(
      m.product_buyAction(),
    );
    expect(productButtonText({ price: { kind: 'pay_what_you_want' } })).toBe(
      m.product_buyAction(),
    );
  });

  it('says Get it free on a free product', () => {
    expect(productButtonText({ price: { kind: 'free' } })).toBe(
      m.product_getFreeAction(),
    );
  });
});
