// @vitest-environment jsdom
import type { ReactElement } from 'react';

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { m } from '../../paraglide/messages';
import { ApplyButton, type ApplyButtonDependencies } from './apply-button';

import { BoardConversionAnalyticsProvider } from '@/components/board-conversion-analytics';
import { pushBoardConversionEvent } from '@/lib/board-pixel-conversions';

vi.mock('@/lib/board-pixel-conversions', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/lib/board-pixel-conversions')>();
  return {
    ...actual,
    pushBoardConversionEvent: vi.fn(actual.pushBoardConversionEvent),
  };
});

const analytics = {
  ga4MeasurementId: null,
  gtmId: 'GTM-TEST',
  metaPixelId: null,
  linkedInPartnerId: null,
  linkedInConversionSignUpId: null,
  linkedInConversionLoginId: null,
  linkedInConversionApplyClickId: null,
  linkedInConversionApplySubmitId: null,
  linkedInConversionJobAlertSubscribeId: null,
};

function renderWithConversion(ui: ReactElement) {
  return render(
    <BoardConversionAnalyticsProvider boardSlug="acme" analytics={analytics}>
      {ui}
    </BoardConversionAnalyticsProvider>,
  );
}

const navigateToExternalApply = vi.fn();
const requestGatewayApply = vi.fn();
const dependencies: ApplyButtonDependencies = {
  loadGatewayApply: async () => ({
    navigateToExternalApply,
    requestGatewayApply,
  }),
};

afterEach(() => {
  cleanup();
  navigateToExternalApply.mockReset();
  requestGatewayApply.mockReset();
  vi.mocked(pushBoardConversionEvent).mockClear();
  vi.restoreAllMocks();
});

const base = {
  jobId: 'job_test_1',
  jobSlug: 'platform-engineer',
  companySlug: 'acme',
  language: 'en',
  returnTo: '/companies/acme/jobs/senior-eng',
  onPrepareApply: vi.fn(async () => ({
    object: 'apply_approval_plan' as const,
    kind: 'not_required' as const,
  })),
  onApply: vi.fn(async () => {}),
  dependencies,
};

const futureExpiry = () => new Date(Date.now() + 60_000).toISOString();

describe('ApplyButton authentication return paths', () => {
  it('blocks Apply and offers a deliberate retry while private application state is unknown', () => {
    const onRetryApplicationState = vi.fn();
    render(
      <ApplyButton
        {...base}
        jobSlug="platform-engineer"
        applicationUrl={null}
        viewer={{ emailVerified: true }}
        applicationState="unknown"
        onRetryApplicationState={onRetryApplicationState}
      />,
    );

    expect(screen.queryByRole('button', { name: /^apply$/i })).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: 'Check application status' }),
    );
    expect(onRetryApplicationState).toHaveBeenCalledOnce();
  });

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

describe('ApplyButton conversion tracking', () => {
  it('does not fire apply_click when the candidate must sign in first', () => {
    renderWithConversion(
      <ApplyButton
        {...base}
        jobSlug="platform-engineer"
        applicationUrl={null}
        viewer={null}
      />,
    );

    fireEvent.click(
      screen.getByRole('link', { name: m.applyButton_applyLabel() }),
    );
    expect(pushBoardConversionEvent).not.toHaveBeenCalled();
  });

  it('does not fire apply_click when the candidate must verify email first', () => {
    renderWithConversion(
      <ApplyButton
        {...base}
        jobSlug="platform-engineer"
        applicationUrl={null}
        viewer={{ emailVerified: false }}
      />,
    );

    fireEvent.click(
      screen.getByRole('link', { name: m.applyButton_applyLabel() }),
    );
    expect(pushBoardConversionEvent).not.toHaveBeenCalled();
  });

  it('fires apply_click for a direct external apply link', () => {
    renderWithConversion(
      <ApplyButton
        {...base}
        jobSlug="ordinary-role"
        applicationUrl="https://jobs.example/apply/ordinary"
        applyAction="external_direct"
        viewer={null}
      />,
    );

    fireEvent.click(screen.getByRole('link', { name: /apply/i }));
    expect(pushBoardConversionEvent).toHaveBeenCalledWith(analytics, {
      event: 'apply_click',
      job_id: 'job_test_1',
      job_slug: 'ordinary-role',
      company_slug: 'acme',
      apply_type: 'external',
      board_slug: 'acme',
    });
  });

  it('fires apply_click only after the gateway approves external apply', async () => {
    requestGatewayApply.mockResolvedValue({
      kind: 'redirect',
      redirectUrl: 'https://employer.example/apply/42',
    });
    renderWithConversion(
      <ApplyButton
        {...base}
        jobSlug="sponsored-role"
        applicationUrl={null}
        applyAction="gateway_external"
        viewer={null}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /apply/i }));
    await waitFor(() =>
      expect(navigateToExternalApply).toHaveBeenCalledWith(
        'https://employer.example/apply/42',
      ),
    );
    expect(pushBoardConversionEvent).toHaveBeenCalledWith(analytics, {
      event: 'apply_click',
      job_id: 'job_test_1',
      job_slug: 'sponsored-role',
      company_slug: 'acme',
      apply_type: 'external',
      board_slug: 'acme',
    });
  });

  it('does not fire apply_click when the gateway denies location', async () => {
    requestGatewayApply.mockResolvedValue({ kind: 'location-denied' });
    renderWithConversion(
      <ApplyButton
        {...base}
        jobSlug="sponsored-role"
        applicationUrl={null}
        applyAction="gateway_external"
        viewer={null}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /apply/i }));
    await screen.findByRole('alertdialog');
    expect(pushBoardConversionEvent).not.toHaveBeenCalled();
  });

  it('fires apply_submit when native apply returns an application id', async () => {
    const onApply = vi.fn(async () => ({ id: 'app_123' }));
    renderWithConversion(
      <ApplyButton
        {...base}
        jobSlug="australia-role"
        applicationUrl={null}
        applyAction="gateway_native"
        viewer={{ emailVerified: true }}
        onPrepareApply={async () => ({
          object: 'apply_approval_plan',
          kind: 'not_required',
        })}
        onApply={onApply}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /apply/i }));
    await waitFor(() =>
      expect(pushBoardConversionEvent).toHaveBeenCalledWith(analytics, {
        event: 'apply_submit',
        job_id: 'job_test_1',
        application_id: 'app_123',
        job_slug: 'australia-role',
        company_slug: 'acme',
        board_slug: 'acme',
      }),
    );
    expect(pushBoardConversionEvent).toHaveBeenCalledWith(analytics, {
      event: 'apply_click',
      job_id: 'job_test_1',
      job_slug: 'australia-role',
      company_slug: 'acme',
      apply_type: 'native',
      board_slug: 'acme',
    });
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
    const form = container.querySelector('form');
    if (!form) throw new Error('Expected the apply control to render a form');
    fireEvent.submit(form);
    expect(
      screen.getByRole<HTMLButtonElement>('button', { name: /applying/i })
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

    expect(
      await screen.findByRole('alertdialog', undefined, { timeout: 10_000 }),
    ).not.toBeNull();
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

  it('uses no-referrer navigation after the canonical gateway allows Apply', async () => {
    requestGatewayApply.mockResolvedValue({
      kind: 'redirect',
      redirectUrl: 'https://employer.example/apply/42',
    });
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

    await waitFor(() =>
      expect(navigateToExternalApply).toHaveBeenCalledWith(
        'https://employer.example/apply/42',
      ),
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
