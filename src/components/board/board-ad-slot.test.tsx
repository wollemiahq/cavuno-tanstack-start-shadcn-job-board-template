// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { BoardAdSlot } from './board-ad-slot';

afterEach(cleanup);

describe('BoardAdSlot', () => {
  it('renders nothing when ads.json has no slot for the placement', () => {
    const { container } = render(
      <BoardAdSlot
        placement="search:rail.start"
        clientId="ca-pub-1234567890123456"
      />,
    );
    expect(container).toBeEmptyDOMElement();
    expect(document.getElementById('cavuno-adsense-loader')).toBeNull();
  });
});
