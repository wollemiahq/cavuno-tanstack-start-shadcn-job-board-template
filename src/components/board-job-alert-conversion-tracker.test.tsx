// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BoardConversionAnalyticsProvider } from '@/components/board-conversion-analytics';
import { BoardJobAlertConversionTracker } from '@/components/board-job-alert-conversion-tracker';
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

afterEach(() => {
  cleanup();
  vi.mocked(pushBoardConversionEvent).mockClear();
});

describe('BoardJobAlertConversionTracker', () => {
  it('fires job_alert_subscribe only when confirmation succeeds', async () => {
    render(
      <BoardConversionAnalyticsProvider boardSlug="acme" analytics={analytics}>
        <BoardJobAlertConversionTracker status="confirmed" />
      </BoardConversionAnalyticsProvider>,
    );

    await waitFor(() =>
      expect(pushBoardConversionEvent).toHaveBeenCalledWith(analytics, {
        event: 'job_alert_subscribe',
        board_slug: 'acme',
        source: 'confirm',
      }),
    );
  });

  it('does not fire for already_confirmed or failed statuses', () => {
    render(
      <BoardConversionAnalyticsProvider boardSlug="acme" analytics={analytics}>
        <BoardJobAlertConversionTracker status="already_confirmed" />
      </BoardConversionAnalyticsProvider>,
    );

    expect(pushBoardConversionEvent).not.toHaveBeenCalled();
  });
});
