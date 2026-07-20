import { cn } from '@/lib/utils';

/**
 * The count cap: anything over nine collapses to "9+" so the badge never
 * stretches past two glyphs and stays a consistent size. Kept as a pure
 * export so the rule can be unit-tested without rendering.
 */
export function formatUnreadCount(count: number): string {
  return count > 9 ? '9+' : String(count);
}

/**
 * The single unread-count treatment shared by the header messaging icon and
 * the messaging dock pill: one deep-red notification badge on the semantic
 * `destructive` token (never a hardcoded colour), a fixed-diameter round
 * chip with the count centred in tabular figures so 1- and 2-glyph counts
 * stay aligned. Renders nothing at zero. Callers pass positioning via
 * `className` (e.g. the header icon's absolute offset).
 */
export function UnreadCountBadge({
  count,
  className,
  ...props
}: { count: number } & React.ComponentProps<'span'>) {
  if (count <= 0) return null;

  return (
    <span
      data-slot="unread-count-badge"
      className={cn(
        'bg-destructive inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[0.625rem] font-semibold text-white tabular-nums',
        className,
      )}
      {...props}
    >
      {formatUnreadCount(count)}
    </span>
  );
}
