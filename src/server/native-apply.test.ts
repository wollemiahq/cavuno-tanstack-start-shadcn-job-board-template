import { createBoardClient } from '@cavuno/board';
import { describe, expect, it, vi } from 'vitest';

import {
  ensureApplySession,
  prepareNativeApply,
  submitNativeApply,
} from './native-apply';

import type { Application, ApplyApprovalPlan, ApplyBody } from '@cavuno/board';

function fakeClient() {
  const board = createBoardClient({
    baseUrl: 'https://api.example.test',
    board: 'pk_native_apply_test',
    auth: { storage: 'nostore' },
  });
  const approvalPlan = {
    object: 'apply_approval_plan',
    kind: 'not_required',
  } satisfies ApplyApprovalPlan;
  const application = {
    id: 'application_123',
    object: 'application',
    status: 'applied',
    appliedAt: '2026-08-24T00:00:00.000Z',
    updatedAt: '2026-08-24T00:00:00.000Z',
    coverNote: null,
    candidateName: null,
    candidateEmail: null,
    candidateLocation: null,
    candidateHeadline: null,
    resumeFilename: null,
    job: null,
  } satisfies Application;
  const prepareApplyApproval = vi
    .spyOn(board.jobs, 'prepareApplyApproval')
    .mockResolvedValue(approvalPlan);
  const apply = vi.spyOn(board.jobs, 'apply').mockResolvedValue(application);
  return {
    board,
    prepareApplyApproval,
    apply,
  };
}

describe('authenticated native Apply server boundary', () => {
  it('prepares with only the server-owned session key', async () => {
    const client = fakeClient();
    await prepareNativeApply(
      client.board,
      'senior engineer/au',
      'server_owned_apply_session_key',
      { authorization: 'Bearer candidate', 'x-board-access': 'grant' },
    );

    expect(client.prepareApplyApproval).toHaveBeenCalledWith(
      'senior engineer/au',
      { sessionKey: 'server_owned_apply_session_key' },
      {
        headers: {
          authorization: 'Bearer candidate',
          'x-board-access': 'grant',
          'x-cavuno-board-capabilities': 'apply-gateway-v1',
        },
      },
    );
    const request = client.prepareApplyApproval.mock.calls[0];
    expect(JSON.stringify(request)).not.toMatch(
      /country|connecting-ip|forwarded/i,
    );
  });

  it('binds a bounded receipt to the same server-owned key on submit', async () => {
    const client = fakeClient();
    await submitNativeApply(
      client.board,
      'senior-engineer',
      { coverNote: 'Hello' },
      'aar_receipt_abcdefghijklmnopqrstuvwxyz',
      'server_owned_apply_session_key',
      { authorization: 'Bearer candidate' },
    );

    expect(client.apply).toHaveBeenCalledWith(
      'senior-engineer',
      {
        coverNote: 'Hello',
        approvalReceipt: 'aar_receipt_abcdefghijklmnopqrstuvwxyz',
        approvalSessionKey: 'server_owned_apply_session_key',
      },
      {
        headers: {
          authorization: 'Bearer candidate',
          'x-cavuno-board-capabilities': 'apply-gateway-v1',
        },
      },
    );
  });

  it('never forwards client-supplied country, IP, or approval session fields', async () => {
    const client = fakeClient();
    const browserBody = {
      name: 'Candidate',
      country: 'AU',
      ip: '203.0.113.1',
      approvalSessionKey: 'browser_forged_key',
    } satisfies ApplyBody & {
      country: string;
      ip: string;
      approvalSessionKey: string;
    };
    await submitNativeApply(
      client.board,
      'senior-engineer',
      browserBody,
      'aar_receipt_abcdefghijklmnopqrstuvwxyz',
      'server_owned_apply_session_key',
      { authorization: 'Bearer candidate' },
    );

    expect(client.apply.mock.calls[0]?.[1]).toMatchObject({
      name: 'Candidate',
      approvalReceipt: 'aar_receipt_abcdefghijklmnopqrstuvwxyz',
      approvalSessionKey: 'server_owned_apply_session_key',
    });
    expect(JSON.stringify(client.apply.mock.calls[0]?.[1])).not.toMatch(
      /203\.0\.113\.1|country|browser_forged_key/,
    );
  });

  it('submits the legacy native body when approval is not required', async () => {
    const client = fakeClient();
    await submitNativeApply(
      client.board,
      'ordinary-role',
      undefined,
      undefined,
      'server_owned_apply_session_key',
      { authorization: 'Bearer candidate' },
    );

    expect(client.apply).toHaveBeenCalledWith(
      'ordinary-role',
      {},
      {
        headers: {
          authorization: 'Bearer candidate',
          'x-cavuno-board-capabilities': 'apply-gateway-v1',
        },
      },
    );
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
