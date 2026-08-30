// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render } from '@testing-library/react';
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

  it('does not fire on confirm (create already counted the subscribe)', () => {
    render(
      <BoardConversionAnalyticsProvider boardSlug="acme" analytics={analytics}>
        <BoardJobAlertConversionTracker status="confirmed" />
      </BoardConversionAnalyticsProvider>,
    );

    expect(pushes).toEqual([]);
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
