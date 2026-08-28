// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { BoardDataLayerEvent } from '@/lib/board-datalayer-events';
import {
  fireBoardPixelConversion,
  flushBoardPixelQueue,
  pushBoardConversionEvent,
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
  linkedInConversionSignUpId: 'signup-conv',
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

    expect(fbq).toHaveBeenCalledWith('track', 'CompleteRegistration');
  });

  it('fires LinkedIn conversion ids when configured', () => {
    const lintrk = vi.fn();
    pixelTestWindow().lintrk = lintrk;

    fireBoardPixelConversion(analytics, 'sign_up');

    expect(lintrk).toHaveBeenCalledWith('track', {
      conversion_id: 'signup-conv',
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
    expect(fbq).toHaveBeenCalledWith('trackCustom', 'Login');
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
