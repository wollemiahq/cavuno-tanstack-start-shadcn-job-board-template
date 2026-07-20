/**
 * Timestamp formatting for the messaging surface (mirrors the hosted board):
 *   - `relativeTime`  — inbox row age: "now" / "5m" / "2h" / "3d" / "Nov 15".
 *   - `clockTime`     — HH:MM under a message bubble (locale-aware).
 *   - `daySeparator`  — "Today" / "Yesterday" / weekday (last 7d) / "Mon 15".
 *   - `EDIT_WINDOW_MS` — the 15-minute edit/unsend window.
 */
import { m } from '@/paraglide/messages';

export const EDIT_WINDOW_MS = 15 * 60 * 1000;

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function relativeTime(iso: string, now = Date.now()): string {
  const then = new Date(iso).getTime();
  const diff = now - then;
  if (diff < MINUTE) return m.messageFormat_now();
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h`;
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)}d`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
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
    return date.toLocaleDateString(undefined, { weekday: 'long' });
  }
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
  });
}

/** Whether a message is still inside its 15-minute edit/unsend window. */
export function withinEditWindow(sentAt: string, now = Date.now()): boolean {
  return now - new Date(sentAt).getTime() < EDIT_WINDOW_MS;
}
