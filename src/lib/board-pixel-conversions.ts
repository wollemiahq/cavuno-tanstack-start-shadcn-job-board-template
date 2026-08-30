import type { BoardAnalyticsConfig } from '@/components/analytics-scripts';
import {
  pushBoardDataLayerEvent,
  type BoardConversionEvent,
  type BoardDataLayerEvent,
} from '@/lib/board-datalayer-events';

/** Per-event LinkedIn Ads conversion IDs (Board API analytics; optional until configured). */
export interface BoardLinkedInConversionIds {
  linkedInConversionSignUpId: string | null;
  linkedInConversionLoginId: string | null;
  linkedInConversionApplyClickId: string | null;
  linkedInConversionApplySubmitId: string | null;
  linkedInConversionJobAlertSubscribeId: string | null;
}

export type BoardConversionAnalyticsConfig = BoardAnalyticsConfig &
  BoardLinkedInConversionIds;

type LinkedInConversionArgs = ['track', { conversion_id: string }];

type QueuedPixelCall =
  | { vendor: 'meta'; args: [string, ...unknown[]] }
  | { vendor: 'linkedin'; args: LinkedInConversionArgs };

type AnalyticsWindow = typeof window & {
  __cavunoBoardPixelQueue?: QueuedPixelCall[];
  fbq?: ((...args: unknown[]) => void) & { queue?: IArguments[] };
  lintrk?: (...args: LinkedInConversionArgs) => void;
};

function analyticsWindow(): AnalyticsWindow {
  // SAFETY: Pixel vendor scripts attach optional fbq/lintrk/queue globals;
  // each call site checks they are functions before invoking them.
  return window as AnalyticsWindow;
}

function pixelQueue(): QueuedPixelCall[] {
  const w = analyticsWindow();
  w.__cavunoBoardPixelQueue = w.__cavunoBoardPixelQueue ?? [];
  return w.__cavunoBoardPixelQueue;
}

/** Drain queued Meta/LinkedIn calls after vendor scripts initialize. */
export function flushBoardPixelQueue(): void {
  if (import.meta.env.SSR) return;
  const w = analyticsWindow();
  const queue = w.__cavunoBoardPixelQueue;
  if (!queue?.length) return;
  const pending: QueuedPixelCall[] = [];
  for (const call of queue) {
    if (call.vendor === 'meta' && w.fbq instanceof Function) {
      w.fbq(...call.args);
      continue;
    }
    if (call.vendor === 'linkedin' && w.lintrk instanceof Function) {
      w.lintrk(...call.args);
      continue;
    }
    pending.push(call);
  }
  w.__cavunoBoardPixelQueue = pending;
}

function queueOrFireMeta(...args: [string, ...unknown[]]) {
  const w = analyticsWindow();
  if (w.fbq instanceof Function) {
    w.fbq(...args);
    return;
  }
  pixelQueue().push({ vendor: 'meta', args });
}

function queueOrFireLinkedIn(...args: LinkedInConversionArgs) {
  const w = analyticsWindow();
  if (w.lintrk instanceof Function) {
    w.lintrk(...args);
    return;
  }
  pixelQueue().push({ vendor: 'linkedin', args });
}

function linkedInConversionId(
  config: BoardConversionAnalyticsConfig,
  event: BoardConversionEvent,
): string | null {
  switch (event) {
    case 'sign_up':
      return config.linkedInConversionSignUpId;
    case 'login':
      return config.linkedInConversionLoginId;
    case 'apply_click':
      return config.linkedInConversionApplyClickId;
    case 'apply_submit':
      return config.linkedInConversionApplySubmitId;
    case 'job_alert_subscribe':
      return config.linkedInConversionJobAlertSubscribeId;
  }
}

function metaParams(
  payload: BoardDataLayerEvent,
): Record<string, string | number | boolean> {
  const { event: _event, ...params } = payload;
  return params;
}

function fireMetaConversion(
  event: BoardConversionEvent,
  payload?: BoardDataLayerEvent,
) {
  const params = payload ? metaParams(payload) : {};
  switch (event) {
    case 'sign_up':
      queueOrFireMeta('track', 'CompleteRegistration', params);
      return;
    case 'login':
      queueOrFireMeta('trackCustom', 'Login', params);
      return;
    case 'apply_click':
      queueOrFireMeta('trackCustom', 'ApplyClick', params);
      return;
    case 'apply_submit':
      queueOrFireMeta('track', 'SubmitApplication', params);
      return;
    case 'job_alert_subscribe':
      queueOrFireMeta('track', 'Subscribe', params);
  }
}

function fireLinkedInConversion(
  config: BoardConversionAnalyticsConfig,
  event: BoardConversionEvent,
) {
  const conversionId = linkedInConversionId(config, event);
  if (!conversionId) return;
  queueOrFireLinkedIn('track', { conversion_id: conversionId });
}

/** Fire native Meta / LinkedIn conversions when the board configures them. */
export function fireBoardPixelConversion(
  config: BoardConversionAnalyticsConfig,
  event: BoardConversionEvent,
  payload?: BoardDataLayerEvent,
): void {
  if (import.meta.env.SSR) return;
  if (config.metaPixelId) fireMetaConversion(event, payload);
  if (config.linkedInPartnerId) fireLinkedInConversion(config, event);
}

/**
 * Single entry point: dataLayer first, then optional Meta / LinkedIn.
 * Matches the hosted boards' one-call-site shape.
 */
export function pushBoardConversionEvent(
  config: BoardConversionAnalyticsConfig,
  payload: BoardDataLayerEvent,
): void {
  pushBoardDataLayerEvent(payload);
  fireBoardPixelConversion(config, payload.event, payload);
}

/** LinkedIn Campaign Manager conversion IDs are numeric; reject obvious non-IDs. */
export function sanitizeConversionId(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!/^\d{3,20}$/.test(trimmed)) return null;
  return trimmed;
}

export const EMPTY_LINKEDIN_CONVERSION_IDS: BoardLinkedInConversionIds = {
  linkedInConversionSignUpId: null,
  linkedInConversionLoginId: null,
  linkedInConversionApplyClickId: null,
  linkedInConversionApplySubmitId: null,
  linkedInConversionJobAlertSubscribeId: null,
};

/** Merge Board API analytics with optional LinkedIn conversion ID fields. */
export function resolveBoardConversionAnalytics(
  analytics: BoardAnalyticsConfig & {
    cookieConsentRequired?: boolean;
    linkedInConversionSignUpId?: string | null;
    linkedInConversionLoginId?: string | null;
    linkedInConversionApplyClickId?: string | null;
    linkedInConversionApplySubmitId?: string | null;
    linkedInConversionJobAlertSubscribeId?: string | null;
  },
): BoardConversionAnalyticsConfig {
  const {
    ga4MeasurementId,
    gtmId,
    metaPixelId,
    linkedInPartnerId,
    linkedInConversionSignUpId = null,
    linkedInConversionLoginId = null,
    linkedInConversionApplyClickId = null,
    linkedInConversionApplySubmitId = null,
    linkedInConversionJobAlertSubscribeId = null,
  } = analytics;
  return {
    ga4MeasurementId,
    gtmId,
    metaPixelId,
    linkedInPartnerId,
    linkedInConversionSignUpId: sanitizeConversionId(linkedInConversionSignUpId),
    linkedInConversionLoginId: sanitizeConversionId(linkedInConversionLoginId),
    linkedInConversionApplyClickId: sanitizeConversionId(
      linkedInConversionApplyClickId,
    ),
    linkedInConversionApplySubmitId: sanitizeConversionId(
      linkedInConversionApplySubmitId,
    ),
    linkedInConversionJobAlertSubscribeId: sanitizeConversionId(
      linkedInConversionJobAlertSubscribeId,
    ),
  };
}
