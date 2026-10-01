import type { PreviewRoster } from './preview';

export interface SandboxProbeDependencies {
  /** `GET /sandbox/personas`: succeeds on a sandbox board, 404s elsewhere. */
  fetchRoster: () => Promise<PreviewRoster>;
  isNotFound: (error: Error) => boolean;
}

/**
 * Per-isolate answer to "is the preview board a sandbox?".
 *
 * Sandbox-ness is deployment-static, and the probe sits on the post-paint
 * entitlements RPC for every viewer, so the answer is paid for once per
 * isolate. Only DEFINITIVE outcomes are kept, for the isolate's lifetime:
 * roster ok means sandbox, 404 means not sandbox. A transient failure
 * answers false for that request without being kept, so a flaky network
 * cannot lock a sandbox board out of its toolbar.
 *
 * Settled values only: each request awaits its own roster read, so a
 * cancelled request never leaves a pending probe for later viewers to wait
 * on.
 */
export function createSandboxProbe(dependencies: SandboxProbeDependencies) {
  let known: boolean | undefined;

  async function probeSandbox(): Promise<boolean> {
    if (known !== undefined) return known;

    // `null` = transient failure: answer false now, ask again next time.
    const answer = await dependencies.fetchRoster().then(
      () => true,
      (error: Error) => (dependencies.isNotFound(error) ? false : null),
    );
    if (answer === null) return false;
    known = answer;
    return answer;
  }

  return {
    probeSandbox,
    reset: () => {
      known = undefined;
    },
  };
}
