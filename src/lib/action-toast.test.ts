import { describe, expect, it, vi } from 'vitest';

import { reconcileCommittedAction } from './action-toast';

describe('committed-action reconciliation', () => {
  it('does not report a successful refresh', async () => {
    const report = vi.fn();

    await expect(
      reconcileCommittedAction(async () => undefined, report),
    ).resolves.toBe(true);
    expect(report).not.toHaveBeenCalled();
  });

  it('reports refresh failure without rethrowing it as mutation failure', async () => {
    const report = vi.fn();

    await expect(
      reconcileCommittedAction(async () => {
        throw new Error('refresh failed');
      }, report),
    ).resolves.toBe(false);
    expect(report).toHaveBeenCalledOnce();
  });
});
