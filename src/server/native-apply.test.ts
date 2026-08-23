import { describe, expect, it, vi } from 'vitest';

import {
  ensureApplySession,
  prepareNativeApply,
  submitNativeApply,
} from './native-apply';

function fakeClient() {
  return {
    fetch: vi.fn(
      async (_path: string, _options: unknown): Promise<unknown> => ({
        object: 'apply_approval_plan',
        kind: 'not_required',
      }),
    ),
  };
}

describe('authenticated native Apply server boundary', () => {
  it('prepares with only the server-owned session key', async () => {
    const client = fakeClient();
    await prepareNativeApply(
      client,
      'senior engineer/au',
      'server_owned_apply_session_key',
      { authorization: 'Bearer candidate', 'x-board-access': 'grant' },
    );

    expect(client.fetch).toHaveBeenCalledWith(
      '/jobs/senior%20engineer%2Fau/apply-approvals',
      {
        method: 'POST',
        headers: {
          authorization: 'Bearer candidate',
          'x-board-access': 'grant',
        },
        body: { sessionKey: 'server_owned_apply_session_key' },
      },
    );
    const request = client.fetch.mock.calls[0]?.[1];
    expect(JSON.stringify(request)).not.toMatch(
      /country|connecting-ip|forwarded/i,
    );
  });

  it('binds a bounded receipt to the same server-owned key on submit', async () => {
    const client = fakeClient();
    await submitNativeApply(
      client,
      'senior-engineer',
      { coverNote: 'Hello' },
      'aar_receipt_abcdefghijklmnopqrstuvwxyz',
      'server_owned_apply_session_key',
      { authorization: 'Bearer candidate' },
    );

    expect(client.fetch).toHaveBeenCalledWith('/jobs/senior-engineer/apply', {
      method: 'POST',
      headers: { authorization: 'Bearer candidate' },
      body: {
        coverNote: 'Hello',
        approvalReceipt: 'aar_receipt_abcdefghijklmnopqrstuvwxyz',
        approvalSessionKey: 'server_owned_apply_session_key',
      },
    });
  });

  it('never forwards client-supplied country, IP, or approval session fields', async () => {
    const client = fakeClient();
    await submitNativeApply(
      client,
      'senior-engineer',
      {
        name: 'Candidate',
        country: 'AU',
        ip: '203.0.113.1',
        approvalSessionKey: 'browser_forged_key',
      } as never,
      'aar_receipt_abcdefghijklmnopqrstuvwxyz',
      'server_owned_apply_session_key',
      { authorization: 'Bearer candidate' },
    );

    expect(client.fetch.mock.calls[0]?.[1]).toMatchObject({
      body: {
        name: 'Candidate',
        approvalReceipt: 'aar_receipt_abcdefghijklmnopqrstuvwxyz',
        approvalSessionKey: 'server_owned_apply_session_key',
      },
    });
    expect(JSON.stringify(client.fetch.mock.calls[0]?.[1])).not.toMatch(
      /203\.0\.113\.1|country|browser_forged_key/,
    );
  });

  it('submits the legacy native body when approval is not required', async () => {
    const client = fakeClient();
    await submitNativeApply(
      client,
      'ordinary-role',
      undefined,
      undefined,
      'server_owned_apply_session_key',
      { authorization: 'Bearer candidate' },
    );

    expect(client.fetch).toHaveBeenCalledWith('/jobs/ordinary-role/apply', {
      method: 'POST',
      headers: { authorization: 'Bearer candidate' },
      body: {},
    });
  });

  it('appends a new host-only Apply cookie without replacing session rotation', () => {
    const responseCookies = ['__Host-cavuno_session=rotated; Path=/; Secure'];
    const sessionKey = ensureApplySession(
      null,
      (name, value, options) => {
        responseCookies.push(
          `${name}=${value}; Path=${options.path}; Secure; HttpOnly; SameSite=Lax`,
        );
      },
      () => 'new_server_owned_apply_session_key',
    );

    expect(sessionKey).toBe('new_server_owned_apply_session_key');
    expect(responseCookies).toEqual([
      '__Host-cavuno_session=rotated; Path=/; Secure',
      '__Host-cavuno_apply_session=new_server_owned_apply_session_key; Path=/; Secure; HttpOnly; SameSite=Lax',
    ]);
  });

  it('reuses an existing valid host-only key without rotating it', () => {
    const persist = vi.fn();
    expect(
      ensureApplySession(
        '__Host-cavuno_apply_session=existing_server_owned_key_123',
        persist,
      ),
    ).toBe('existing_server_owned_key_123');
    expect(persist).not.toHaveBeenCalled();
  });
});
