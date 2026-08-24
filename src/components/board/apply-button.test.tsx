// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { m } from '../../paraglide/messages';
import { ApplyButton } from './apply-button';

const { requestGatewayApply } = vi.hoisted(() => ({
  requestGatewayApply: vi.fn(),
}));

vi.mock('@/lib/gateway-apply', () => ({ requestGatewayApply }));

afterEach(() => {
  cleanup();
  requestGatewayApply.mockReset();
  vi.restoreAllMocks();
});

const base = {
  language: 'en',
  returnTo: '/companies/acme/jobs/senior-eng',
  onPrepareApply: vi.fn(async () => ({
    object: 'apply_approval_plan' as const,
    kind: 'not_required' as const,
  })),
  onApply: vi.fn(async () => {}),
};

const futureExpiry = () => new Date(Date.now() + 60_000).toISOString();

describe('ApplyButton authentication return paths', () => {
  it('keeps the complete job destination through candidate sign-in', () => {
    const returnTo =
      '/companies/acme/jobs/platform-engineer?source=search#apply';
    render(
      <ApplyButton
        {...base}
        jobSlug="platform-engineer"
        applicationUrl={null}
        viewer={null}
        returnTo={returnTo}
      />,
    );

    const link = screen.getByRole('link', {
      name: m.applyButton_applyLabel(),
    });
    const href = link.getAttribute('href');
    expect(href).not.toBeNull();
    const signInUrl = new URL(href!, 'https://board.example');
    expect(signInUrl.pathname).toBe('/auth/sign-in');
    expect(signInUrl.searchParams.get('returnTo')).toBe(returnTo);
  });

  it('keeps the complete job destination through email verification', () => {
    const returnTo = '/jobs?q=platform&selectedJob=platform-engineer';
    render(
      <ApplyButton
        {...base}
        jobSlug="platform-engineer"
        applicationUrl={null}
        viewer={{ emailVerified: false }}
        returnTo={returnTo}
      />,
    );

    const link = screen.getByRole('link', {
      name: m.applyButton_applyLabel(),
    });
    const href = link.getAttribute('href');
    expect(href).not.toBeNull();
    const verifyUrl = new URL(href!, 'https://board.example');
    expect(verifyUrl.pathname).toBe('/auth/verify-email-required');
    expect(verifyUrl.searchParams.get('returnTo')).toBe(returnTo);
  });
});

describe('ApplyButton gateway external jobs', () => {
  it('posts only the job slug to the board-local Apply route, with no provider or gateway link', () => {
    const sponsoredUrl = 'https://provider.example/raw-sponsored-destination';
    const { container } = render(
      <ApplyButton
        {...base}
        jobSlug="sponsored-role"
        applicationUrl={sponsoredUrl}
        applyAction="gateway_external"
        viewer={null}
      />,
    );

    const form = container.querySelector('form');
    expect(form?.getAttribute('method')).toBe('post');
    expect(form?.getAttribute('action')).toBe('/apply');
    expect(
      container.querySelector('input[name="jobSlug"]')?.getAttribute('value'),
    ).toBe('sponsored-role');
    expect(container.innerHTML).not.toContain(sponsoredUrl);
    expect(container.querySelector('a')).toBeNull();
  });

  it('disables the gateway Apply control after a submit to avoid a double click', () => {
    requestGatewayApply.mockImplementation(() => new Promise(() => {}));
    const { container } = render(
      <ApplyButton
        {...base}
        jobSlug="sponsored-role"
        applicationUrl={null}
        applyAction="gateway_external"
        viewer={null}
      />,
    );
    const form = container.querySelector('form')!;
    fireEvent.submit(form);
    expect(
      (screen.getByRole('button', { name: /applying/i }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it('shows a lazy location dialog when the canonical gateway returns the location code', async () => {
    requestGatewayApply.mockResolvedValue({ kind: 'location-denied' });
    render(
      <ApplyButton
        {...base}
        jobSlug="sponsored-role"
        applicationUrl={null}
        applyAction="gateway_external"
        viewer={null}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /apply/i }));

    expect(await screen.findByRole('alertdialog')).not.toBeNull();
    expect(
      screen.getByRole('heading', {
        name: m.apply_locationUnavailableTitle(),
      }),
    ).not.toBeNull();
    expect(screen.getByText(m.apply_locationNotEligibleError())).not.toBeNull();
    expect(requestGatewayApply).toHaveBeenCalledWith(
      expect.any(HTMLFormElement),
    );
  });

  it('keeps an ordinary direct external application as an employer link', () => {
    render(
      <ApplyButton
        {...base}
        jobSlug="ordinary-role"
        applicationUrl="https://jobs.example/apply/ordinary"
        applyAction="external_direct"
        viewer={null}
      />,
    );
    expect(screen.getByRole('link').getAttribute('href')).toBe(
      'https://jobs.example/apply/ordinary',
    );
  });
});

describe('ApplyButton native approval flow', () => {
  it('uses the stable prepare seam and passes the browser-edge receipt to native Apply', async () => {
    const order: string[] = [];
    const onPrepareApply = vi.fn(async () => {
      order.push('prepare');
      return {
        object: 'apply_approval_plan' as const,
        kind: 'approval_required' as const,
        approvalUrl:
          'https://apply.cavuno.com/r/aar_abcdefghijklmnopqrstuvwxyz',
        expiresAt: futureExpiry(),
      };
    });
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      order.push('gateway');
      return new Response(
        JSON.stringify({
          object: 'apply_approval_receipt',
          id: 'aar_receipt_abcdefghijklmnopqrstuvwxyz',
          expiresAt: futureExpiry(),
        }),
        { status: 200 },
      );
    });
    const onApply = vi.fn(async (_jobSlug: string, _receiptId?: string) => {
      order.push('apply');
    });

    render(
      <ApplyButton
        {...base}
        jobSlug="australia-role"
        applicationUrl={null}
        applyAction="gateway_native"
        viewer={{ emailVerified: true }}
        onPrepareApply={onPrepareApply}
        onApply={onApply}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /apply/i }));

    await waitFor(() => expect(order).toEqual(['prepare', 'gateway', 'apply']));
    expect(onApply).toHaveBeenCalledWith(
      'australia-role',
      'aar_receipt_abcdefghijklmnopqrstuvwxyz',
    );
    expect(
      await screen.findByRole('link', { name: /view applications/i }),
    ).not.toBeNull();
  });

  it('shows the localized location dialog and does not apply after an explicit gateway 4xx', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 403 }),
    );
    const onApply = vi.fn(async () => {});

    render(
      <ApplyButton
        {...base}
        jobSlug="australia-role"
        applicationUrl={null}
        applyAction="gateway_native"
        viewer={{ emailVerified: true }}
        onPrepareApply={async () => ({
          object: 'apply_approval_plan',
          kind: 'approval_required',
          approvalUrl:
            'https://apply.cavuno.com/r/aar_abcdefghijklmnopqrstuvwxyz',
          expiresAt: futureExpiry(),
        })}
        onApply={onApply}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /apply/i }));

    expect(await screen.findByRole('alertdialog')).not.toBeNull();
    expect(screen.getByText(m.apply_locationNotEligibleError())).not.toBeNull();
    expect(onApply).not.toHaveBeenCalled();
  });

  it('degrades to ordinary native Apply for a malformed trusted gateway response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ object: 'unexpected' }), { status: 200 }),
    );
    const onApply = vi.fn(async () => {});

    render(
      <ApplyButton
        {...base}
        jobSlug="australia-role"
        applicationUrl={null}
        applyAction="gateway_native"
        viewer={{ emailVerified: true }}
        onPrepareApply={async () => ({
          object: 'apply_approval_plan',
          kind: 'approval_required',
          approvalUrl:
            'https://apply.cavuno.com/r/aar_abcdefghijklmnopqrstuvwxyz',
          expiresAt: futureExpiry(),
        })}
        onApply={onApply}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /apply/i }));

    await waitFor(() => expect(onApply).toHaveBeenCalledWith('australia-role'));
    expect(
      await screen.findByRole('link', { name: /view applications/i }),
    ).not.toBeNull();
  });
});
