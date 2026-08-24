import type { Metric } from 'web-vitals';

export const WEB_VITAL_EVENT = 'cavuno:web-vital';

export interface WebVitalDetail {
  name: Metric['name'];
  id: string;
  value: number;
  delta: number;
  rating: Metric['rating'];
  navigationType: Metric['navigationType'];
}

let started = false;

function reportWebVital(metric: Metric) {
  const detail: WebVitalDetail = {
    name: metric.name,
    id: metric.id,
    value: metric.value,
    delta: metric.delta,
    rating: metric.rating,
    navigationType: metric.navigationType,
  };

  // A stable browser event lets adopters forward metrics to any analytics
  // backend without coupling this template to another vendor or endpoint.
  window.dispatchEvent(
    new CustomEvent<WebVitalDetail>(WEB_VITAL_EVENT, { detail }),
  );

  // SAFETY: Analytics scripts attach optional globals to window; both are
  // checked before use and ignored when absent.
  const analyticsWindow = window as typeof window & {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  };
  const eventParameters = {
    value: Math.round(
      metric.name === 'CLS' ? metric.value * 1_000 : metric.value,
    ),
    metric_id: metric.id,
    metric_value: metric.value,
    metric_delta: metric.delta,
    metric_rating: metric.rating,
    non_interaction: true,
  };

  if (analyticsWindow.gtag instanceof Function) {
    analyticsWindow.gtag('event', metric.name, eventParameters);
  } else if (Array.isArray(analyticsWindow.dataLayer)) {
    analyticsWindow.dataLayer.push({
      event: 'web_vital',
      metric_name: metric.name,
      ...eventParameters,
    });
  }
}

/**
 * Starts one set of page-lifetime observers. The runtime package is imported
 * after hydration so Web Vitals measurement adds no code to the initial
 * render chunk; buffered PerformanceObserver entries still cover page load.
 */
export async function startWebVitalsReporting() {
  if (started) return;
  started = true;

  try {
    const { onCLS, onINP, onLCP } = await import('web-vitals');
    onCLS(reportWebVital);
    onINP(reportWebVital);
    onLCP(reportWebVital);
  } catch {
    // Old/locked-down browsers may not expose the required performance APIs.
    // Reporting is observability only and must never affect the application.
    started = false;
  }
}
