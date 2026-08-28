// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { BoardAuthConversionTracker } from '@/components/board-auth-conversion-tracker';
import { BoardConversionAnalyticsProvider } from '@/components/board-conversion-analytics';

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
  window.history.replaceState({}, '', '/');
  Reflect.deleteProperty(window, 'dataLayer');
  Reflect.deleteProperty(window, 'fbq');
});

describe('BoardAuthConversionTracker', () => {
  it('fires sign_up from cavuno_auth query params and strips them', async () => {
    window.history.replaceState(
      {},
      '',
      '/auth/verify-email-required?returnTo=%2Faccount&cavuno_auth=sign_up&cavuno_auth_method=password',
    );
    const pushes: { event: string; method: string; board_slug: string }[] = [];
    window.dataLayer = pushes as unknown as typeof window.dataLayer;

    render(
      <BoardConversionAnalyticsProvider boardSlug="acme" analytics={analytics}>
        <BoardAuthConversionTracker />
      </BoardConversionAnalyticsProvider>,
    );

    await waitFor(() =>
      expect(pushes).toContainEqual({
        event: 'sign_up',
        method: 'password',
        board_slug: 'acme',
      }),
    );
    expect(window.location.search).toBe('?returnTo=%2Faccount');
  });
});
