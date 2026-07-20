import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

/**
 * Company mark: the shadcn Avatar primitive (load-state fallback, ring,
 * a11y) shaped as a rounded square — companies read as logo-squares, not
 * person-circles. The primitive's image falls back to initials on load
 * failure; logos use object-contain so they are never cropped.
 */
const BOX = { sm: 'size-10', md: 'size-11', lg: 'size-12' } as const;
const TEXT = { sm: 'text-sm', md: 'text-base', lg: 'text-lg' } as const;

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
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0]!)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <Avatar
      className={cn('rounded-[9px] after:rounded-[9px]', BOX[size], className)}
    >
      {logoUrl ? (
        <AvatarImage
          src={logoUrl}
          alt={name}
          className="rounded-[9px] object-contain"
        />
      ) : null}
      <AvatarFallback
        className={cn('rounded-[9px] font-semibold tracking-wide', TEXT[size])}
      >
        {initials || '?'}
      </AvatarFallback>
    </Avatar>
  );
}
