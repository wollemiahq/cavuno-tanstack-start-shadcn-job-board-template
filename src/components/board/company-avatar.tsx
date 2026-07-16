import { cn } from '@/lib/utils';

/**
 * Company mark: the real logo when it exists, initials on the ink chip
 * otherwise (direction-C stress fix S3/S5 — logos mostly exist on the
 * wire; the initials fallback is still exercised by real companies).
 */
export function CompanyAvatar({
  name,
  logoUrl,
  size = 'sm',
  className,
}: {
  name: string;
  logoUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const box =
    size === 'lg'
      ? 'size-12 text-lg'
      : size === 'md'
        ? 'size-11 text-base'
        : 'size-10 text-sm';
  if (logoUrl) {
    return (
      <span
        className={cn(
          'border-border bg-background flex shrink-0 items-center justify-center overflow-hidden rounded-[9px] border',
          box,
          className,
        )}
        aria-hidden="true"
      >
        <img
          src={logoUrl}
          alt=""
          width={64}
          height={64}
          className="size-full object-contain"
        />
      </span>
    );
  }
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0]!)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <span
      className={cn(
        'bg-foreground text-background flex shrink-0 items-center justify-center rounded-[9px] font-semibold tracking-wide',
        box,
        className,
      )}
      aria-hidden="true"
    >
      {initials || '?'}
    </span>
  );
}
