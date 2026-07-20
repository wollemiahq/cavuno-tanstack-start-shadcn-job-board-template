import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { initialsOf } from '@/lib/initials';

/**
 * Company mark — the one shared way a company logo renders across every
 * board surface. It is a thin, override-free wrapper over the owned Avatar
 * primitive: the shape, ring, and image fit all come from the primitive, so
 * a company reads identically everywhere (and matches people avatars, which
 * use the same primitive directly). The only thing this adds over a raw
 * `<Avatar>` is the two-letter initials fallback when no logo exists.
 *
 * `size` is the Avatar primitive's own scale — `sm`/`default`/`lg`/`xl`
 * (size-6/8/10/12). `className` is a layout-only passthrough (margins,
 * responsive display); it must never carry shape/size/fit overrides.
 */
export function CompanyAvatar({
  name,
  logoUrl,
  size = 'default',
  className,
}: {
  name: string;
  logoUrl?: string | null;
  size?: 'sm' | 'default' | 'lg' | 'xl';
  className?: string;
}) {
  return (
    <Avatar size={size} className={className}>
      {logoUrl ? <AvatarImage src={logoUrl} alt={name} /> : null}
      <AvatarFallback>{initialsOf(name)}</AvatarFallback>
    </Avatar>
  );
}
