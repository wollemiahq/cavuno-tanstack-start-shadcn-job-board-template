// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { BoardDataLayerEvent } from '@/lib/board-datalayer-events';
import {
  fireBoardPixelConversion,
  flushBoardPixelQueue,
  pushBoardConversionEvent,
  resolveBoardConversionAnalytics,
  sanitizeConversionId,
} from '@/lib/board-pixel-conversions';

type PixelTestWindow = typeof window & {
  __cavunoBoardPixelQueue?: unknown[];
  fbq?: (...args: unknown[]) => void;
  lintrk?: (event: 'track', payload: { conversion_id: string }) => void;
};

function pixelTestWindow(): PixelTestWindow {
  // SAFETY: This file installs fbq/lintrk/queue on window and deletes them
  // in afterEach; production only reads those same optional slots.
  return window as PixelTestWindow;
}

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
  gtmId: null,
  metaPixelId: '1234567890',
  linkedInPartnerId: '54321',
  linkedInConversionSignUpId: '123456',
  linkedInConversionLoginId: null,
  linkedInConversionApplyClickId: null,
  linkedInConversionApplySubmitId: null,
  linkedInConversionJobAlertSubscribeId: null,
};

afterEach(() => {
  Reflect.deleteProperty(window, '__cavunoBoardPixelQueue');
  Reflect.deleteProperty(window, 'fbq');
  Reflect.deleteProperty(window, 'lintrk');
  Reflect.deleteProperty(window, 'dataLayer');
});

describe('board-pixel-conversions', () => {
  it('queues Meta calls until fbq is ready, then flushes', () => {
    pushBoardConversionEvent(analytics, {
      event: 'sign_up',
      method: 'password',
      board_slug: 'acme',
    });

    const fbq = vi.fn();
    pixelTestWindow().fbq = fbq;
    flushBoardPixelQueue();

    expect(fbq).toHaveBeenCalledWith('track', 'CompleteRegistration', {
      method: 'password',
      board_slug: 'acme',
    });
  });

  it('fires LinkedIn conversion ids when configured', () => {
    const lintrk = vi.fn();
    pixelTestWindow().lintrk = lintrk;

    fireBoardPixelConversion(analytics, 'sign_up');

    expect(lintrk).toHaveBeenCalledWith('track', {
      conversion_id: '123456',
    });
  });

  it('pushes dataLayer before pixels', () => {
    const pushes = captureDataLayer();
    const fbq = vi.fn();
    pixelTestWindow().fbq = fbq;

    pushBoardConversionEvent(analytics, {
      event: 'login',
      method: 'magic_link',
      board_slug: 'acme',
    });

    expect(pushes[0]).toEqual({
      event: 'login',
      method: 'magic_link',
      board_slug: 'acme',
    });
    expect(fbq).toHaveBeenCalledWith('trackCustom', 'Login', {
      method: 'magic_link',
      board_slug: 'acme',
    });
  });

  it('accepts trimmed 3-20 digit LinkedIn conversion ids and rejects the rest', () => {
    expect(sanitizeConversionId('123')).toBe('123');
    expect(sanitizeConversionId(' 9876543210 ')).toBe('9876543210');
    expect(sanitizeConversionId('12345678901234567890')).toBe(
      '12345678901234567890',
    );
    expect(sanitizeConversionId('12')).toBeNull();
    expect(sanitizeConversionId('signup-conv')).toBeNull();
    expect(sanitizeConversionId('123456789012345678901')).toBeNull();
    expect(sanitizeConversionId('')).toBeNull();
    expect(sanitizeConversionId(null)).toBeNull();
  });

  it('nulls invalid LinkedIn conversion ids when resolving analytics', () => {
    expect(
      resolveBoardConversionAnalytics({
        ga4MeasurementId: null,
        gtmId: null,
        metaPixelId: null,
        linkedInPartnerId: '54321',
        linkedInConversionSignUpId: ' 14008476 ',
        linkedInConversionLoginId: 'ab',
        linkedInConversionApplyClickId: 'signup-conv',
        linkedInConversionApplySubmitId: '12',
        linkedInConversionJobAlertSubscribeId: '999',
      }),
    ).toEqual({
      ga4MeasurementId: null,
      gtmId: null,
      metaPixelId: null,
      linkedInPartnerId: '54321',
      linkedInConversionSignUpId: '14008476',
      linkedInConversionLoginId: null,
      linkedInConversionApplyClickId: null,
      linkedInConversionApplySubmitId: null,
      linkedInConversionJobAlertSubscribeId: '999',
    });
  });

  it('retains queued calls when vendor scripts are not ready', () => {
    const metaOnly = {
      ...analytics,
      linkedInPartnerId: null,
      linkedInConversionSignUpId: null,
    };
    pushBoardConversionEvent(metaOnly, {
      event: 'sign_up',
      method: 'password',
      board_slug: 'acme',
    });

    flushBoardPixelQueue();

    expect(pixelTestWindow().__cavunoBoardPixelQueue).toHaveLength(1);
  });
});
