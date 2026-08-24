// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';

import { navigateToExternalApply, requestGatewayApply } from './gateway-apply';

function applyForm() {
  const form = document.createElement('form');
  form.action = 'https://board.example/apply';
  const jobSlug = document.createElement('input');
  jobSlug.name = 'jobSlug';
  jobSlug.value = 'sponsored-role';
  form.appendChild(jobSlug);
  return form;
}

describe('requestGatewayApply', () => {
  it('turns the canonical gateway denial code into a UI result', async () => {
    const gatewayUrl = 'https://apply.cavuno.com/a/opaque_intent_1234567890';
    const fetchApply = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ gatewayUrl }))
      .mockResolvedValueOnce(
        Response.json({ code: 'APPLY_LOCATION_UNAVAILABLE' }, { status: 403 }),
      );

    await expect(requestGatewayApply(applyForm(), fetchApply)).resolves.toEqual(
      { kind: 'location-denied' },
    );
    expect(fetchApply).toHaveBeenCalledWith(
      'https://board.example/apply',
      expect.objectContaining({
        method: 'POST',
        headers: { accept: 'application/json' },
        credentials: 'same-origin',
      }),
    );
    expect(fetchApply).toHaveBeenCalledWith(
      gatewayUrl,
      expect.objectContaining({
        method: 'GET',
        headers: { accept: 'application/json' },
        credentials: 'omit',
        mode: 'cors',
        redirect: 'error',
      }),
    );
  });

  it('returns a successful canonical gateway destination', async () => {
    const fetchApply = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({
          gatewayUrl: 'https://apply.cavuno.com/a/opaque_intent_1234567890',
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          redirectUrl: 'https://employer.example/apply/42',
        }),
      );

    await expect(requestGatewayApply(applyForm(), fetchApply)).resolves.toEqual(
      {
        kind: 'redirect',
        redirectUrl: 'https://employer.example/apply/42',
      },
    );
  });

  it('keeps an ordinary infrastructure fallback to one board-local request', async () => {
    const fetchApply = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json({ redirectUrl: 'https://employer.example/apply/42' }),
      );

    await expect(requestGatewayApply(applyForm(), fetchApply)).resolves.toEqual(
      {
        kind: 'redirect',
        redirectUrl: 'https://employer.example/apply/42',
      },
    );
    expect(fetchApply).toHaveBeenCalledTimes(1);
  });
});

describe('navigateToExternalApply', () => {
  it('activates an HTTPS destination without sending the board referrer', () => {
    const activate = vi.fn((link: HTMLAnchorElement) => {
      expect(link.isConnected).toBe(true);
      expect(link.href).toBe('https://employer.example/apply/42');
      expect(link.target).toBe('_self');
      expect(link.rel).toContain('noreferrer');
      expect(link.referrerPolicy).toBe('no-referrer');
    });

    navigateToExternalApply('https://employer.example/apply/42', activate);

    expect(activate).toHaveBeenCalledOnce();
    expect(document.querySelector('a[href*="employer.example"]')).toBeNull();
  });
});
