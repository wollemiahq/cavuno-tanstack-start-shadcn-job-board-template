import { useCallback, useEffect, useState } from 'react';

import { getProduct } from '../server/products';

import type { Product } from '@cavuno/board';

export type SelectedProductState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  product?: Product;
  retry: () => void;
};

/** The `/products` desktop pane: fetch the selected product's page data. */
export function useSelectedProduct(
  productSlug: string | undefined,
  load: typeof getProduct = getProduct,
): SelectedProductState {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<Omit<SelectedProductState, 'retry'>>({
    status: 'idle',
  });

  useEffect(() => {
    if (!productSlug) {
      setState({ status: 'idle' });
      return;
    }
    let cancelled = false;
    setState((previous) => ({ status: 'loading', product: previous.product }));
    load({ data: { productSlug } })
      .then((product) => {
        if (!cancelled) setState({ status: 'ready', product });
      })
      .catch(() => {
        if (!cancelled) {
          setState((previous) => ({
            status: 'error',
            product: previous.product,
          }));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [attempt, load, productSlug]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  return { ...state, retry };
}
