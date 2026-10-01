import { describe, expect, it, vi } from 'vitest';

import { createSandboxProbe } from './sandbox-probe';

import type { PreviewRoster } from './preview';

const notFound = new Error('Not Found');
const ROSTER: PreviewRoster = { personas: [], password: 'sandbox' };

function probe(fetchRoster: () => Promise<PreviewRoster>) {
  return createSandboxProbe({
    fetchRoster,
    isNotFound: (error) => error === notFound,
  }).probeSandbox;
}

describe('createSandboxProbe', () => {
  it('reads the roster once and keeps a sandbox answer', async () => {
    const fetchRoster = vi.fn(async () => ROSTER);
    const probeSandbox = probe(fetchRoster);

    expect(await probeSandbox()).toBe(true);
    expect(await probeSandbox()).toBe(true);
    expect(fetchRoster).toHaveBeenCalledOnce();
  });

  it('keeps a 404 as a definitive non-sandbox answer', async () => {
    const fetchRoster = vi.fn((): Promise<PreviewRoster> =>
      Promise.reject(notFound),
    );
    const probeSandbox = probe(fetchRoster);

    expect(await probeSandbox()).toBe(false);
    expect(await probeSandbox()).toBe(false);
    expect(fetchRoster).toHaveBeenCalledOnce();
  });

  it('does not keep a transient failure', async () => {
    const fetchRoster = vi
      .fn<() => Promise<PreviewRoster>>()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(ROSTER);
    const probeSandbox = probe(fetchRoster);

    expect(await probeSandbox()).toBe(false);
    expect(await probeSandbox()).toBe(true);
    expect(fetchRoster).toHaveBeenCalledTimes(2);
  });

  it('never makes a later viewer wait on a probe that never settles', async () => {
    const fetchRoster = vi
      .fn<() => Promise<PreviewRoster>>()
      .mockImplementationOnce(() => new Promise(() => {}))
      .mockResolvedValueOnce(ROSTER);
    const probeSandbox = probe(fetchRoster);
    void probeSandbox();

    expect(await probeSandbox()).toBe(true);
    expect(fetchRoster).toHaveBeenCalledTimes(2);
  });
});
