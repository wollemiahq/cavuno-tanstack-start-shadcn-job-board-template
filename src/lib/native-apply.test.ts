import { describe, expect, it, vi } from 'vitest';

import {
  parseApplyApprovalPlan,
  runNativeApply,
  type ApplyApprovalPlan,
} from './native-apply';

const FUTURE_EXPIRY = new Date(Date.now() + 60_000).toISOString();

const requiredPlan: ApplyApprovalPlan = {
  object: 'apply_approval_plan',
  kind: 'approval_required',
  approvalUrl: 'https://apply.cavuno.com/r/aar_abcdefghijklmnopqrstuvwxyz',
  expiresAt: FUTURE_EXPIRY,
};

function receiptResponse(
  body: unknown = {
    object: 'apply_approval_receipt',
    id: 'aar_receipt_abcdefghijklmnopqrstuvwxyz',
    expiresAt: FUTURE_EXPIRY,
  },
) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

describe('native Apply approval seam', () => {
  it('accepts a local approval URL for development smoke', () => {
    expect(
      parseApplyApprovalPlan({
        ...requiredPlan,
        approvalUrl: 'http://localhost:3000/r/aar_abcdefghijklmnopqrstuvwxyz',
      }),
    ).toMatchObject({
      kind: 'approval_required',
      approvalUrl: 'http://localhost:3000/r/aar_abcdefghijklmnopqrstuvwxyz',
    });
  });

  it('prepares, obtains a user-edge receipt, then submits in order', async () => {
    const order: string[] = [];
    const prepare = vi.fn(async () => {
      order.push('prepare');
      return requiredPlan;
    });
    const fetchGateway = vi.fn(async (_url: string, init?: RequestInit) => {
      order.push('gateway');
      expect(init).toEqual({
        method: 'POST',
        credentials: 'omit',
        mode: 'cors',
        redirect: 'error',
      });
      expect(init).not.toHaveProperty('body');
      expect(init).not.toHaveProperty('headers');
      return receiptResponse();
    });
    const submit = vi.fn(async (_jobSlug: string, _receiptId?: string) => {
      order.push('submit');
      return { ok: true };
    });

    await expect(
      runNativeApply({
        jobSlug: 'senior-engineer',
        prepare,
        submit,
        fetchGateway,
      }),
    ).resolves.toEqual({ ok: true });

    expect(order).toEqual(['prepare', 'gateway', 'submit']);
    expect(fetchGateway).toHaveBeenCalledWith(
      requiredPlan.approvalUrl,
      expect.any(Object),
    );
    expect(submit).toHaveBeenCalledWith(
      'senior-engineer',
      'aar_receipt_abcdefghijklmnopqrstuvwxyz',
    );
  });

  it('submits directly after a not-required plan', async () => {
    const fetchGateway = vi.fn();
    const submit = vi.fn(async () => 'applied');

    await expect(
      runNativeApply({
        jobSlug: 'ordinary-role',
        prepare: async () => ({
          object: 'apply_approval_plan',
          kind: 'not_required',
        }),
        submit,
        fetchGateway,
      }),
    ).resolves.toBe('applied');

    expect(fetchGateway).not.toHaveBeenCalled();
    expect(submit).toHaveBeenCalledWith('ordinary-role');
  });

  it('degrades to direct native apply when preparation is unavailable', async () => {
    const submit = vi.fn(async () => 'applied');

    await expect(
      runNativeApply({
        jobSlug: 'ordinary-role',
        prepare: async () => {
          throw new TypeError('network unavailable');
        },
        submit,
        fetchGateway: vi.fn(),
      }),
    ).resolves.toBe('applied');

    expect(submit).toHaveBeenCalledWith('ordinary-role');
  });

  it.each([
    {
      name: 'gateway network failure',
      fetchGateway: async () => {
        throw new TypeError('Failed to fetch');
      },
    },
    {
      name: 'gateway 5xx',
      fetchGateway: async () => new Response(null, { status: 503 }),
    },
    {
      name: 'expired or missing edge row',
      fetchGateway: async () => new Response(null, { status: 404 }),
    },
  ])('degrades to direct native apply on $name', async ({ fetchGateway }) => {
    const submit = vi.fn(async () => 'applied');

    await expect(
      runNativeApply({
        jobSlug: 'ordinary-role',
        prepare: async () => requiredPlan,
        submit,
        fetchGateway,
      }),
    ).resolves.toBe('applied');

    expect(submit).toHaveBeenCalledWith('ordinary-role');
  });

  it('stops on an explicit gateway 4xx denial', async () => {
    const submit = vi.fn();

    await expect(
      runNativeApply({
        jobSlug: 'australia-only-role',
        prepare: async () => requiredPlan,
        submit,
        fetchGateway: async () => new Response(null, { status: 403 }),
      }),
    ).rejects.toMatchObject({
      name: 'NativeApplyApprovalError',
      reason: 'denied',
    });
    expect(submit).not.toHaveBeenCalled();
  });

  it.each([
    ['wrong host', 'https://board.example/r/aar_abcdefghijklmnopqrstuvwxyz'],
    [
      'wrong scheme',
      'http://apply.cavuno.com/r/aar_abcdefghijklmnopqrstuvwxyz',
    ],
    [
      'credentials',
      'https://user@apply.cavuno.com/r/aar_abcdefghijklmnopqrstuvwxyz',
    ],
    [
      'query',
      'https://apply.cavuno.com/r/aar_abcdefghijklmnopqrstuvwxyz?next=evil',
    ],
    ['wrong path', 'https://apply.cavuno.com/a/aar_abcdefghijklmnopqrstuvwxyz'],
  ])('rejects an untrusted approval URL: %s', async (_name, approvalUrl) => {
    const submit = vi.fn();
    await expect(
      runNativeApply({
        jobSlug: 'role',
        prepare: async () => ({ ...requiredPlan, approvalUrl }),
        submit,
        fetchGateway: vi.fn(),
      }),
    ).rejects.toMatchObject({ reason: 'malformed_plan' });
    expect(submit).not.toHaveBeenCalled();
  });

  it('rejects an already-expired approval plan instead of degrading direct', async () => {
    const submit = vi.fn();
    await expect(
      runNativeApply({
        jobSlug: 'role',
        prepare: async () => ({
          ...requiredPlan,
          expiresAt: '2000-01-01T00:00:00.000Z',
        }),
        submit,
        fetchGateway: vi.fn(),
      }),
    ).rejects.toMatchObject({ reason: 'malformed_plan' });
    expect(submit).not.toHaveBeenCalled();
  });

  it.each([
    [
      'wrong object',
      {
        object: 'other',
        id: 'aar_receipt_abcdefghijklmnopqrstuvwxyz',
        expiresAt: '2030-01-01T00:00:00Z',
      },
    ],
    [
      'missing token',
      { object: 'apply_approval_receipt', expiresAt: '2030-01-01T00:00:00Z' },
    ],
    [
      'oversized token',
      {
        object: 'apply_approval_receipt',
        id: `aar_${'a'.repeat(400)}`,
        expiresAt: '2030-01-01T00:00:00Z',
      },
    ],
    [
      'invalid expiry',
      {
        object: 'apply_approval_receipt',
        id: 'aar_receipt_abcdefghijklmnopqrstuvwxyz',
        expiresAt: 'tomorrow',
      },
    ],
  ])(
    'degrades direct on a malformed trusted receipt: %s',
    async (_name, body) => {
      const submit = vi.fn(async () => 'applied');
      await expect(
        runNativeApply({
          jobSlug: 'role',
          prepare: async () => requiredPlan,
          submit,
          fetchGateway: async () => receiptResponse(body),
        }),
      ).resolves.toBe('applied');
      expect(submit).toHaveBeenCalledWith('role');
    },
  );

  it('degrades direct on an already-expired trusted receipt', async () => {
    const submit = vi.fn(async () => 'applied');
    await expect(
      runNativeApply({
        jobSlug: 'role',
        prepare: async () => requiredPlan,
        submit,
        fetchGateway: async () =>
          receiptResponse({
            object: 'apply_approval_receipt',
            id: 'aar_receipt_abcdefghijklmnopqrstuvwxyz',
            expiresAt: '2000-01-01T00:00:00.000Z',
          }),
      }),
    ).resolves.toBe('applied');
    expect(submit).toHaveBeenCalledWith('role');
  });
});
