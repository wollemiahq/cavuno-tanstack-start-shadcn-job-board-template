import { Badge } from '@/components/ui/badge';

/**
 * A company's membership, rendered as public identity wherever that company
 * appears. The badge text is the plan's CURRENT display name off the wire
 * (`company.membership.planName`) — operators rename plans, and `planId` is the
 * stable key, so nothing here is keyed on the wording.
 *
 * Renders nothing when the company holds no membership, so every call site can
 * mount it unconditionally.
 */
export function MembershipBadge({
  planName,
  className,
}: {
  planName: string | null | undefined;
  className?: string;
}) {
  const label = planName?.trim();
  if (!label) return null;
  return (
    <Badge variant="outline" className={className} dir="auto">
      {label}
    </Badge>
  );
}
