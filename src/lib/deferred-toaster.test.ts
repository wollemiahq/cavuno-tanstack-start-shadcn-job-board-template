import { describe, expect, it, vi } from 'vitest';

describe('deferred toaster request', () => {
  it('notifies a listener that subscribed before the request', async () => {
    vi.resetModules();
    const { onToasterRequested, requestToaster } =
      await import('./deferred-toaster');
    const listener = vi.fn();
    onToasterRequested(listener);
    expect(listener).not.toHaveBeenCalled();

    requestToaster();
    expect(listener).toHaveBeenCalledOnce();
  });

  // The page-load toast's effect runs before the root's (children commit
  // first), so the root must still see a request made before it subscribed.
  it('notifies a listener that subscribes after the request', async () => {
    vi.resetModules();
    const { onToasterRequested, requestToaster } =
      await import('./deferred-toaster');
    requestToaster();

    const listener = vi.fn();
    onToasterRequested(listener);
    expect(listener).toHaveBeenCalledOnce();
  });

  it('stops notifying after unsubscribe', async () => {
    vi.resetModules();
    const { onToasterRequested, requestToaster } =
      await import('./deferred-toaster');
    const listener = vi.fn();
    onToasterRequested(listener)();

    requestToaster();
    expect(listener).not.toHaveBeenCalled();
  });
});
