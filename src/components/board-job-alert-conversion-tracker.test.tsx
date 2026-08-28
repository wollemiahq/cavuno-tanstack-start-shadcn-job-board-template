// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { BoardConversionAnalyticsProvider } from '@/components/board-conversion-analytics';
import { BoardJobAlertConversionTracker } from '@/components/board-job-alert-conversion-tracker';
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

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(window, 'dataLayer');
});

describe('BoardJobAlertConversionTracker', () => {
  let pushes: BoardDataLayerEvent[];

  beforeEach(() => {
    pushes = captureDataLayer();
  });

  it('fires job_alert_subscribe only when confirmation succeeds', async () => {
    render(
      <BoardConversionAnalyticsProvider boardSlug="acme" analytics={analytics}>
        <BoardJobAlertConversionTracker status="confirmed" />
      </BoardConversionAnalyticsProvider>,
    );

    await waitFor(() =>
      expect(pushes).toContainEqual({
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

    expect(pushes).toEqual([]);
  });
});
