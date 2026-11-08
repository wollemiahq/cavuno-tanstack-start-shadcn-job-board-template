import { lazy, Suspense } from 'react';

import { BadgeCheck } from 'lucide-react';

import { m } from '@/paraglide/messages';

// The tooltip code loads after the page; the tick shows meanwhile.
const VerifiedTickTooltip = lazy(() =>
  import('./item-verification-verified-tick').then((module) => ({
    default: module.VerifiedTickTooltip,
  })),
);

/** What a verified item's tooltip says: how it was verified. */
export function verifiedTooltipText(
  kind: 'experience' | 'education' | 'other',
  verifiedDomain: string | null | undefined,
): string {
  if (verifiedDomain && kind === 'experience')
    return m.itemVerification_verifiedWorkEmailTooltip();
  if (verifiedDomain && kind === 'education')
    return m.itemVerification_verifiedSchoolEmailTooltip();
  return m.itemVerification_verifiedLabel();
}

/**
 * The filled verified tick beside an item's title, with a tooltip saying how
 * the item was verified. Nothing to open.
 */
export function VerifiedTick({
  label,
  tooltip,
}: {
  /** What screen readers hear; the tooltip text when not given. */
  label?: string;
  tooltip: string;
}) {
  const tick = (
    <span
      className="inline-flex"
      tabIndex={0}
      role="img"
      aria-label={label ?? tooltip}
      data-test="item-verification-tick"
    >
      <BadgeCheck
        aria-hidden
        className="fill-verified text-verified-foreground size-4"
      />
    </span>
  );
  return (
    <Suspense fallback={tick}>
      <VerifiedTickTooltip tick={tick} text={tooltip} />
    </Suspense>
  );
}
