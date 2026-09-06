// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

import { BoardAdPreviewProvider } from './board-ad-preview';
import { ListingAdResults } from './listing-ad-results';

import { ADS_OFF } from '@/lib/board-ads';

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.unstubAllGlobals();
});
function setup(matches: boolean) {
  sessionStorage.setItem('cavuno:preview-ad-placements', 'true');
  vi.stubGlobal('matchMedia', () => ({
    matches,
    addEventListener() {},
    removeEventListener() {},
  }));
  return render(
    <BoardAdPreviewProvider enabled>
      <ListingAdResults ads={ADS_OFF}>
        {[1, 2, 3, 4].map((id) => (
          <article key={id} data-result-id={id}>
            {id}
          </article>
        ))}
      </ListingAdResults>
    </BoardAdPreviewProvider>,
  );
}
it('places one inline unit between results without making it part of a selectable card', () => {
  const { container } = setup(true);
  const ad = container.querySelector('[data-ad-preview="search:inline"]');
  expect(ad).toBeInTheDocument();
  expect(ad?.closest('[data-result-id]')).toBeNull();
  expect(ad?.previousElementSibling).toHaveAttribute('data-result-id', '3');
  expect(ad?.nextElementSibling).toHaveAttribute('data-result-id', '4');
  expect(container.querySelectorAll('[data-ad-preview]')).toHaveLength(1);
});
it('does not duplicate the inline placement when its media query does not match', () => {
  const { container } = setup(false);
  expect(container.querySelector('[data-ad-preview]')).toBeNull();
  expect(container.querySelectorAll('article')).toHaveLength(4);
});
