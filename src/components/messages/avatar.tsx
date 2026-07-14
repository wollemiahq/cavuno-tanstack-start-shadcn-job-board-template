import {
  Avatar as AvatarRoot,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';

/** Round avatar with an initials fallback — used across the messaging
 * surface. Thin wrapper over the owned shadcn Avatar so callsites keep
 * the messaging-domain API (url + name). */
export function Avatar({
  url,
  name,
  className,
}: {
  url: string | null;
  name: string;
  className?: string;
}) {
  const initials = name.trim().charAt(0).toUpperCase() || '?';
  return (
    <AvatarRoot className={className}>
      {url ? <AvatarImage src={url} alt={name} /> : null}
      <AvatarFallback aria-label={name}>{initials}</AvatarFallback>
    </AvatarRoot>
  );
}
