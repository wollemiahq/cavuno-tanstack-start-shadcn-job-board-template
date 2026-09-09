// @vitest-environment jsdom

import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BoardAnalyticsBoot } from './board-analytics-boot';

afterEach(() => {
  cleanup();
});

describe('BoardAnalyticsBoot', () => {
  it('installs Cavuno Analytics for a publishable key', () => {
    const install = vi.fn();
    render(
      <BoardAnalyticsBoot publishableKey="pk_test_board" install={install} />,
    );
    expect(install).toHaveBeenCalledWith({ publishableKey: 'pk_test_board' });
  });

  it('skips install when the key is not publishable', () => {
    const install = vi.fn();
    render(<BoardAnalyticsBoot publishableKey="not-a-pk" install={install} />);
    expect(install).not.toHaveBeenCalled();
  });

  it.each([
    '5173-workspace-token.preview.cavuno.com',
    '5173-workspace-token.preview-dev.cavuno.com',
  ])('skips install in a WORKING preview on %s', (hostname) => {
    const install = vi.fn();
    render(
      <BoardAnalyticsBoot
        publishableKey="pk_test_board"
        install={install}
        hostname={hostname}
      />,
    );
    expect(install).not.toHaveBeenCalled();
  });
});
