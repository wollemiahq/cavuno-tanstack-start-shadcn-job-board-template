'use client';

/** Confirm is a no-op. `job_alert_subscribe` fires on subscribe-form create. */
export function BoardJobAlertConversionTracker(_props: {
  status: 'confirmed' | 'already_confirmed' | 'expired' | 'not_found';
}) {
  return null;
}
