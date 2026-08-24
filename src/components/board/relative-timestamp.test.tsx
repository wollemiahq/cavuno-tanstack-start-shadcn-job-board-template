// @vitest-environment jsdom
import { act } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { RelativeTimestamp } from './relative-timestamp';

describe('RelativeTimestamp', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('does not report an expected minute-boundary hydration mismatch', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const container = document.createElement('div');
    container.innerHTML = renderToString(
      <RelativeTimestamp label="26 min. ago" prefix=" · Posted " />,
    );
    document.body.appendChild(container);

    let root: ReturnType<typeof hydrateRoot> | undefined;
    await act(async () => {
      root = hydrateRoot(
        container,
        <RelativeTimestamp label="27 min. ago" prefix=" · Posted " />,
      );
    });

    expect(consoleError).not.toHaveBeenCalled();
    await act(async () => root?.unmount());
  });
});
