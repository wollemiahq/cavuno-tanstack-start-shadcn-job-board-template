// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { BoardAdSlot } from './board-ad-slot';

afterEach(cleanup);

describe('BoardAdSlot', () => {
  it('renders nothing when ads.json is the stock disabled file', () => {
    const { container } = render(
      <BoardAdSlot placement="jobs:list.banner" className="py-4" />,
    );
    expect(container).toBeEmptyDOMElement();
    expect(document.getElementById('cavuno-adsense-loader')).toBeNull();
  });
});
