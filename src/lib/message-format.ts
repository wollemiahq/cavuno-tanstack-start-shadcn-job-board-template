/**
 * Timestamp formatting for the messaging surface (mirrors the hosted board):
 *   - `relativeTime`  — inbox row age: "now" / "5m" / "2h" / "3d" / "Nov 15".
 *   - `clockTime`     — HH:MM under a message bubble (locale-aware).
 *   - `daySeparator`  — "Today" / "Yesterday" / weekday (last 7d) / "Mon 15".
 *   - `EDIT_WINDOW_MS` — the 15-minute edit/unsend window.
 */
import { m } from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';

/** Compact localized duration ("5m" / "5 Min." / "5min") via Intl units. */
function narrowUnit(value: number, unit: 'minute' | 'hour' | 'day'): string {
  try {
    return new Intl.NumberFormat(getLocale(), {
      style: 'unit',
      unit,
      unitDisplay: 'narrow',
    }).format(value);
  } catch {
    return String(value);
  }
}

export const EDIT_WINDOW_MS = 15 * 60 * 1000;

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function relativeTime(iso: string, now = Date.now()): string {
  const then = new Date(iso).getTime();
  const diff = now - then;
  if (diff < MINUTE) return m.messageFormat_now();
  if (diff < HOUR) return narrowUnit(Math.floor(diff / MINUTE), 'minute');
  if (diff < DAY) return narrowUnit(Math.floor(diff / HOUR), 'hour');
  if (diff < 7 * DAY) return narrowUnit(Math.floor(diff / DAY), 'day');
  return new Date(iso).toLocaleDateString(getLocale(), {
    month: 'short',
    day: 'numeric',
  });
}

export function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(getLocale(), {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Midnight-anchored day key so messages group by calendar day, not 24h age. */
function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function daySeparator(iso: string, now = Date.now()): string {
  const date = new Date(iso);
  const today = new Date(now);
  if (dayKey(iso) === dayKey(today.toISOString()))
    return m.messageFormat_today();

  const yesterday = new Date(now - DAY);
  if (dayKey(iso) === dayKey(yesterday.toISOString()))
    return m.messageFormat_yesterday();

  if (now - date.getTime() < 7 * DAY) {
    return date.toLocaleDateString(getLocale(), { weekday: 'long' });
  }
  return date.toLocaleDateString(getLocale(), {
    weekday: 'short',
    day: 'numeric',
  });
}

/** Whether a message is still inside its 15-minute edit/unsend window. */
export function withinEditWindow(sentAt: string, now = Date.now()): boolean {
  return now - new Date(sentAt).getTime() < EDIT_WINDOW_MS;
}
