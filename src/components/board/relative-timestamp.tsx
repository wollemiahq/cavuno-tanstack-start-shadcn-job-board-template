/**
 * Relative labels are intentionally time-dependent: SSR and hydration can
 * straddle a minute boundary even when both render from the same job data.
 * Keep that expected one-node difference from forcing React to discard and
 * rebuild the surrounding result card or job-detail tree.
 */
export function RelativeTimestamp({
  label,
  prefix = '',
}: {
  label: string;
  prefix?: string;
}) {
  return <span suppressHydrationWarning>{`${prefix}${label}`}</span>;
}
