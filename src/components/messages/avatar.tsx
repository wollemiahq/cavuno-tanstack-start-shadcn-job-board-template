import { Avatar as UntitledUiAvatar } from '@/components/base/avatar/avatar'

/** Round avatar with an initials fallback — used across the messaging
 * surface. Thin wrapper over the Untitled UI Avatar so callsites keep
 * the messaging-domain API (url + name). */
export function Avatar({
  url,
  name,
  className,
}: {
  url: string | null
  name: string
  className?: string
}) {
  const initials = name.trim().charAt(0).toUpperCase() || '?'
  return (
    <UntitledUiAvatar
      src={url}
      alt={name}
      initials={initials}
      size="md"
      className={className}
    />
  )
}
