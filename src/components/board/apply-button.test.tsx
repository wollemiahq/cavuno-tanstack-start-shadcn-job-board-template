// @vitest-environment jsdom
import { useState, type ReactElement } from 'react';

import { analytics as boardAnalytics } from '@cavuno/board/analytics';
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { m } from '../../paraglide/messages';
import { ApplyButton, type ApplyButtonDependencies } from './apply-button';

import { BoardConversionAnalyticsProvider } from '@/components/board-conversion-analytics';
import type { BoardDataLayerEvent } from '@/lib/board-datalayer-events';

function captureDataLayer(): BoardDataLayerEvent[] {
  const pushes: BoardDataLayerEvent[] = [];
  Object.defineProperty(window, 'dataLayer', {
    configurable: true,
    writable: true,
    value: pushes,
  });
  return pushes;
}

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
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => ui,
  });
  const stubs = [
    '/auth/sign-in',
    '/auth/verify-email',
    '/auth/verify-email-required',
    '/account/applications',
  ].map((path) =>
    createRoute({
      getParentRoute: () => rootRoute,
      path,
      component: () => null,
    }),
  );
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, ...stubs]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  return render(
    <BoardConversionAnalyticsProvider boardSlug="acme" analytics={analytics}>
      <RouterProvider router={router} />
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
  Reflect.deleteProperty(window, 'dataLayer');
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
  it('blocks Apply and offers a deliberate retry while private application state is unknown', async () => {
    const onRetryApplicationState = vi.fn();
    renderWithConversion(
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
      await screen.findByRole('button', { name: 'Check application status' }),
    );
    expect(onRetryApplicationState).toHaveBeenCalledOnce();
  });

  it('still offers an external Apply when private application state is unknown', () => {
    render(
      <ApplyButton
        {...base}
        jobSlug="platform-engineer"
        applicationUrl="https://example.com/cjj-starter-apply"
        viewer={{ emailVerified: true }}
        applicationState="unknown"
        nativeApplications={false}
        onRetryApplicationState={vi.fn()}
      />,
    );

    const apply = screen.getByRole('link', { name: /^apply$/i });
    expect(apply.getAttribute('href')).toBe(
      'https://example.com/cjj-starter-apply',
    );
    expect(
      screen.queryByRole('button', { name: 'Check application status' }),
    ).toBeNull();
  });

  it('keeps the complete job destination through candidate sign-in', async () => {
    const returnTo =
      '/companies/acme/jobs/platform-engineer?source=search#apply';
    renderWithConversion(
      <ApplyButton
        {...base}
        jobSlug="platform-engineer"
        applicationUrl={null}
        viewer={null}
        returnTo={returnTo}
      />,
    );

    const link = await screen.findByRole('link', {
      name: m.applyButton_applyLabel(),
    });
    const href = link.getAttribute('href');
    expect(href).not.toBeNull();
    const signInUrl = new URL(href!, 'https://board.example');
    expect(signInUrl.pathname).toBe('/auth/sign-in');
    expect(signInUrl.searchParams.get('returnTo')).toBe(returnTo);
  });

  it('keeps the complete job destination through email verification', async () => {
    const returnTo = '/jobs?q=platform&selectedJob=platform-engineer';
    renderWithConversion(
      <ApplyButton
        {...base}
        jobSlug="platform-engineer"
        applicationUrl={null}
        viewer={{ emailVerified: false }}
        returnTo={returnTo}
      />,
    );

    const link = await screen.findByRole('link', {
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
  let pushes: BoardDataLayerEvent[];

  beforeEach(() => {
    pushes = captureDataLayer();
  });

  it('does not fire apply_click when the candidate must sign in first', async () => {
    renderWithConversion(
      <ApplyButton
        {...base}
        jobSlug="platform-engineer"
        applicationUrl={null}
        viewer={null}
      />,
    );

    fireEvent.click(
      await screen.findByRole('link', { name: m.applyButton_applyLabel() }),
    );
    expect(pushes).toEqual([]);
  });

  it('does not fire apply_click when the candidate must verify email first', async () => {
    renderWithConversion(
      <ApplyButton
        {...base}
        jobSlug="platform-engineer"
        applicationUrl={null}
        viewer={{ emailVerified: false }}
      />,
    );

    fireEvent.click(
      await screen.findByRole('link', { name: m.applyButton_applyLabel() }),
    );
    expect(pushes).toEqual([]);
  });

  it('fires apply_click for a direct external apply link', async () => {
    const track = vi
      .spyOn(boardAnalytics, 'track')
      .mockImplementation(() => undefined);
    renderWithConversion(
      <ApplyButton
        {...base}
        jobSlug="ordinary-role"
        applicationUrl="https://jobs.example/apply/ordinary"
        applyAction="external_direct"
        viewer={null}
      />,
    );

    fireEvent.click(await screen.findByRole('link', { name: /apply/i }));
    expect(pushes).toContainEqual({
      event: 'apply_click',
      job_id: 'job_test_1',
      job_slug: 'ordinary-role',
      company_slug: 'acme',
      apply_type: 'external',
      board_slug: 'acme',
    });
    expect(track).toHaveBeenCalledWith('job_apply_click', {
      jobId: 'job_test_1',
      jobSlug: 'ordinary-role',
      companySlug: 'acme',
    });
  });

  it('fires first-party job_apply_click when companySlug is empty', async () => {
    const track = vi
      .spyOn(boardAnalytics, 'track')
      .mockImplementation(() => undefined);
    renderWithConversion(
      <ApplyButton
        {...base}
        companySlug=""
        jobSlug="ordinary-role"
        applicationUrl="https://jobs.example/apply/ordinary"
        applyAction="external_direct"
        viewer={null}
      />,
    );

    fireEvent.click(await screen.findByRole('link', { name: /apply/i }));
    expect(track).toHaveBeenCalledWith('job_apply_click', {
      jobId: 'job_test_1',
      jobSlug: 'ordinary-role',
      companySlug: '',
    });
    expect(pushes).not.toContainEqual(
      expect.objectContaining({ event: 'apply_click' }),
    );
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

    fireEvent.click(await screen.findByRole('button', { name: /apply/i }));
    await waitFor(() =>
      expect(navigateToExternalApply).toHaveBeenCalledWith(
        'https://employer.example/apply/42',
      ),
    );
    expect(pushes).toContainEqual({
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

    fireEvent.click(await screen.findByRole('button', { name: /apply/i }));
    await screen.findByRole('alertdialog');
    expect(pushes).toEqual([]);
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

    fireEvent.click(await screen.findByRole('button', { name: /apply/i }));
    await waitFor(() =>
      expect(pushes).toContainEqual({
        event: 'apply_submit',
        job_id: 'job_test_1',
        application_id: 'app_123',
        job_slug: 'australia-role',
        company_slug: 'acme',
        board_slug: 'acme',
      }),
    );
    expect(pushes).toContainEqual({
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
  it('posts only the job slug to the board-local Apply route, with no provider or gateway link', async () => {
    const sponsoredUrl = 'https://provider.example/raw-sponsored-destination';
    const { container } = renderWithConversion(
      <ApplyButton
        {...base}
        jobSlug="sponsored-role"
        applicationUrl={sponsoredUrl}
        applyAction="gateway_external"
        viewer={null}
      />,
    );

    await screen.findByRole('button', { name: /apply/i });
    const form = container.querySelector('form');
    expect(form?.getAttribute('method')).toBe('post');
    expect(form?.getAttribute('action')).toBe('/apply');
    expect(
      container.querySelector('input[name="jobSlug"]')?.getAttribute('value'),
    ).toBe('sponsored-role');
    expect(container.innerHTML).not.toContain(sponsoredUrl);
    expect(container.querySelector('a')).toBeNull();
  });

  it('disables the gateway Apply control after a submit to avoid a double click', async () => {
    requestGatewayApply.mockImplementation(() => new Promise(() => {}));
    const { container } = renderWithConversion(
      <ApplyButton
        {...base}
        jobSlug="sponsored-role"
        applicationUrl={null}
        applyAction="gateway_external"
        viewer={null}
      />,
    );
    await screen.findByRole('button', { name: /apply/i });
    const form = container.querySelector('form');
    if (!form) throw new Error('Expected the apply control to render a form');
    fireEvent.submit(form);
    expect(
      (
        await screen.findByRole<HTMLButtonElement>('button', {
          name: /applying/i,
        })
      ).disabled,
    ).toBe(true);
  });

  it('shows a lazy location dialog when the canonical gateway returns the location code', async () => {
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

    fireEvent.click(await screen.findByRole('button', { name: /apply/i }));

    expect(
      await screen.findByRole('alertdialog', undefined, { timeout: 10_000 }),
    ).not.toBeNull();
    expect(
      await screen.findByRole('heading', {
        name: m.apply_locationUnavailableTitle(),
      }),
    ).not.toBeNull();
    expect(screen.getByText(m.apply_locationNotEligibleError())).not.toBeNull();
    expect(requestGatewayApply).toHaveBeenCalledWith(
      expect.any(HTMLFormElement),
    );
  });

  it('keeps an ordinary direct external application as an employer link', async () => {
    renderWithConversion(
      <ApplyButton
        {...base}
        jobSlug="ordinary-role"
        applicationUrl="https://jobs.example/apply/ordinary"
        applyAction="external_direct"
        viewer={null}
      />,
    );
    expect((await screen.findByRole('link')).getAttribute('href')).toBe(
      'https://jobs.example/apply/ordinary',
    );
  });

  it('uses no-referrer navigation after the canonical gateway allows Apply', async () => {
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

    fireEvent.click(await screen.findByRole('button', { name: /apply/i }));

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

    renderWithConversion(
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
    fireEvent.click(await screen.findByRole('button', { name: /apply/i }));

    await waitFor(() => expect(order).toEqual(['prepare', 'gateway', 'apply']));
    expect(onApply).toHaveBeenCalledWith(
      'australia-role',
      'aar_receipt_abcdefghijklmnopqrstuvwxyz',
      undefined,
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

    renderWithConversion(
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
    fireEvent.click(await screen.findByRole('button', { name: /apply/i }));

    expect(await screen.findByRole('alertdialog')).not.toBeNull();
    expect(screen.getByText(m.apply_locationNotEligibleError())).not.toBeNull();
    expect(onApply).not.toHaveBeenCalled();
  });

  it('degrades to ordinary native Apply for a malformed trusted gateway response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ object: 'unexpected' }), { status: 200 }),
    );
    const onApply = vi.fn(async () => {});

    renderWithConversion(
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
    fireEvent.click(await screen.findByRole('button', { name: /apply/i }));

    await waitFor(() =>
      expect(onApply).toHaveBeenCalledWith(
        'australia-role',
        undefined,
        undefined,
      ),
    );
    expect(
      await screen.findByRole('link', { name: /view applications/i }),
    ).not.toBeNull();
  });
});

/**
 * Guest apply (registration wall OFF). The platform accepts an anonymous
 * native apply unless the wall is on, so forcing sign-in here loses the
 * application outright on the 129 wall-off prod boards.
 */
describe('ApplyButton guest apply', () => {
  it('offers the guest form to an anonymous visitor when a submit handler is wired', async () => {
    renderWithConversion(
      <ApplyButton
        {...base}
        jobSlug="platform-engineer"
        applicationUrl={null}
        viewer={null}
        onGuestApply={vi.fn(async () => ({
          ok: true as const,
          applicationId: 'app_1',
        }))}
      />,
    );

    expect(
      await screen.findByLabelText(m.apply_guestEmailLabel()),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: m.apply_guestSubmitLabel() }),
    ).toBeTruthy();
  });

  it('falls back to the sign-in CTA when no guest handler is wired', async () => {
    renderWithConversion(
      <ApplyButton
        {...base}
        jobSlug="platform-engineer"
        applicationUrl={null}
        viewer={null}
      />,
    );

    expect(screen.queryByLabelText(m.apply_guestEmailLabel())).toBeNull();
    expect(await screen.findByRole('link', { name: /apply/i })).toBeTruthy();
  });

  it('never offers the guest form once the registration wall is up', async () => {
    renderWithConversion(
      <ApplyButton
        {...base}
        jobSlug="platform-engineer"
        applicationUrl={null}
        viewer={null}
        registrationWall
        onGuestApply={vi.fn(async () => ({
          ok: true as const,
          applicationId: 'app_1',
        }))}
      />,
    );

    expect(screen.queryByLabelText(m.apply_guestEmailLabel())).toBeNull();
    expect(await screen.findByRole('link', { name: /apply/i })).toBeTruthy();
  });

  it('submits the guest details and confirms', async () => {
    const onGuestApply = vi.fn(async () => ({
      ok: true as const,
      applicationId: 'app_1',
    }));
    renderWithConversion(
      <ApplyButton
        {...base}
        jobSlug="platform-engineer"
        applicationUrl={null}
        viewer={null}
        onGuestApply={onGuestApply}
      />,
    );

    fireEvent.change(await screen.findByLabelText(m.apply_guestNameLabel()), {
      target: { value: '  Ada Lovelace  ' },
    });
    fireEvent.change(screen.getByLabelText(m.apply_guestEmailLabel()), {
      target: { value: 'ada@example.com' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: m.apply_guestSubmitLabel() }),
    );

    await waitFor(() => {
      expect(onGuestApply).toHaveBeenCalledWith({
        jobSlug: 'platform-engineer',
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        coverNote: undefined,
      });
    });
    await screen.findByText(m.apply_guestSubmittedHeading());
  });

  it('surfaces the board-requires-an-account rejection distinctly', async () => {
    renderWithConversion(
      <ApplyButton
        {...base}
        jobSlug="platform-engineer"
        applicationUrl={null}
        viewer={null}
        onGuestApply={vi.fn(async () => ({
          ok: false as const,
          reason: 'guest_not_allowed',
        }))}
      />,
    );

    fireEvent.change(await screen.findByLabelText(m.apply_guestEmailLabel()), {
      target: { value: 'ada@example.com' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: m.apply_guestSubmitLabel() }),
    );

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe(m.apply_guestNotAllowedError());
  });
});

/**
 * Hosted parity: the signed-in native path collects a cover note and an
 * optional per-application resume. The guest form on the same board already
 * collects more than a bare button does.
 */
describe('ApplyButton native apply extras', () => {
  const resumeFile = () =>
    new File(['cv'], 'cv.pdf', { type: 'application/pdf' });

  function renderNative(props: {
    onApply: (
      jobSlug: string,
      approvalReceipt?: string,
      body?: { coverNote?: string },
    ) => Promise<{ id: string } | void>;
    onUploadResume?: (input: {
      jobSlug: string;
      file: File;
    }) => Promise<{ id: string } | void>;
  }) {
    renderWithConversion(
      <ApplyButton
        {...base}
        jobSlug="platform-engineer"
        applicationUrl={null}
        applyAction="gateway_native"
        viewer={{ emailVerified: true }}
        onPrepareApply={async () => ({
          object: 'apply_approval_plan',
          kind: 'not_required',
        })}
        {...props}
      />,
    );
  }

  it('sends the cover note the candidate typed with the native apply', async () => {
    const onApply = vi.fn(async () => ({ id: 'app_1' }));
    renderNative({
      onApply,
      onUploadResume: vi.fn(async () => ({ id: 'app_1' })),
    });

    fireEvent.change(
      await screen.findByLabelText(m.apply_guestCoverNoteLabel()),
      { target: { value: '  I ship boards.  ' } },
    );
    fireEvent.click(screen.getByRole('button', { name: /apply/i }));

    await waitFor(() =>
      expect(onApply).toHaveBeenCalledWith('platform-engineer', undefined, {
        coverNote: 'I ship boards.',
      }),
    );
  });

  it('uploads the chosen resume after the application is created', async () => {
    const onApply = vi.fn(async () => ({ id: 'app_1' }));
    const onUploadResume = vi.fn(async () => ({ id: 'app_1' }));
    renderNative({ onApply, onUploadResume });

    const file = resumeFile();
    fireEvent.change(
      await screen.findByLabelText(m.applyButton_resumeLabel()),
      {
        target: { files: [file] },
      },
    );
    fireEvent.click(screen.getByRole('button', { name: /apply/i }));

    await waitFor(() =>
      expect(onUploadResume).toHaveBeenCalledWith({
        jobSlug: 'platform-engineer',
        file,
      }),
    );
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByRole('link', { name: /view applications/i }),
    ).not.toBeNull();
  });

  it('keeps one-click apply: no resume chosen means no upload call', async () => {
    const onApply = vi.fn(async () => ({ id: 'app_1' }));
    const onUploadResume = vi.fn(async () => ({ id: 'app_1' }));
    renderNative({ onApply, onUploadResume });

    fireEvent.click(await screen.findByRole('button', { name: /apply/i }));

    await waitFor(() =>
      expect(onApply).toHaveBeenCalledWith(
        'platform-engineer',
        undefined,
        undefined,
      ),
    );
    expect(onUploadResume).not.toHaveBeenCalled();
  });

  it('omits the resume field when no upload handler is wired', async () => {
    renderNative({ onApply: vi.fn(async () => ({ id: 'app_1' })) });

    await screen.findByLabelText(m.apply_guestCoverNoteLabel());
    expect(screen.queryByLabelText(m.applyButton_resumeLabel())).toBeNull();
  });

  it('says the application was sent when only the resume upload fails', async () => {
    const onApply = vi.fn(async () => ({ id: 'app_1' }));
    const onUploadResume = vi.fn(async () => {
      throw new Error('upload failed');
    });
    renderNative({ onApply, onUploadResume });

    fireEvent.change(
      await screen.findByLabelText(m.applyButton_resumeLabel()),
      {
        target: { files: [resumeFile()] },
      },
    );
    fireEvent.click(screen.getByRole('button', { name: /apply/i }));

    expect((await screen.findByRole('alert')).textContent).toBe(
      m.applyButton_resumeUploadError(),
    );
    expect(onApply).toHaveBeenCalledTimes(1);
  });

  it('retries only the upload after a resume failure, never the apply', async () => {
    const onApply = vi.fn(async () => ({ id: 'app_1' }));
    const onUploadResume = vi
      .fn<() => Promise<{ id: string }>>()
      .mockRejectedValueOnce(new Error('upload failed'))
      .mockResolvedValueOnce({ id: 'app_1' });
    renderNative({ onApply, onUploadResume });

    fireEvent.change(
      await screen.findByLabelText(m.applyButton_resumeLabel()),
      {
        target: { files: [resumeFile()] },
      },
    );
    fireEvent.click(screen.getByRole('button', { name: /apply/i }));
    await screen.findByRole('alert');

    fireEvent.click(screen.getByRole('button', { name: /apply/i }));

    await screen.findByRole('link', { name: /applied/i });
    expect(onUploadResume).toHaveBeenCalledTimes(2);
    expect(onApply).toHaveBeenCalledTimes(1);
  });

  it('forgets a chosen resume when the pane switches to another job', async () => {
    const onApply = vi.fn(async () => ({ id: 'app_1' }));
    const onUploadResume = vi.fn(async () => ({ id: 'app_1' }));
    // Same component instance, new job: the master-detail pane does this
    // when the candidate picks another result.
    function Host() {
      const [jobSlug, setJobSlug] = useState('platform-engineer');
      return (
        <>
          <button type="button" onClick={() => setJobSlug('data-engineer')}>
            switch job
          </button>
          <ApplyButton
            {...base}
            jobSlug={jobSlug}
            applicationUrl={null}
            applyAction="gateway_native"
            viewer={{ emailVerified: true }}
            onPrepareApply={async () => ({
              object: 'apply_approval_plan',
              kind: 'not_required',
            })}
            onApply={onApply}
            onUploadResume={onUploadResume}
          />
        </>
      );
    }
    renderWithConversion(<Host />);

    const input = await screen.findByLabelText<HTMLInputElement>(
      m.applyButton_resumeLabel(),
    );
    fireEvent.change(input, { target: { files: [resumeFile()] } });
    expect(input.files).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'switch job' }));

    const fresh = await screen.findByLabelText<HTMLInputElement>(
      m.applyButton_resumeLabel(),
    );
    expect(fresh.files).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: /apply/i }));
    await screen.findByRole('link', { name: /applied/i });
    expect(onUploadResume).not.toHaveBeenCalled();
  });
});
