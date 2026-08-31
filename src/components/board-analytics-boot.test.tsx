// @vitest-environment jsdom

import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { install } = vi.hoisted(() => ({
  install: vi.fn(),
}));

vi.mock('@cavuno/board/analytics', () => ({
  analytics: { install },
}));

import { BoardAnalyticsBoot } from './board-analytics-boot';

afterEach(() => {
  cleanup();
  install.mockClear();
});

describe('BoardAnalyticsBoot', () => {
  it('installs Cavuno Analytics for a publishable key', () => {
    render(<BoardAnalyticsBoot publishableKey="pk_test_board" />);
    expect(install).toHaveBeenCalledWith({ publishableKey: 'pk_test_board' });
  });

  it('skips install when the key is not publishable', () => {
    render(<BoardAnalyticsBoot publishableKey="not-a-pk" />);
    expect(install).not.toHaveBeenCalled();
  });
});
