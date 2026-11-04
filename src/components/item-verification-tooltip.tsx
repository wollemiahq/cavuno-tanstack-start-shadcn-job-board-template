'use client';

import type { RefObject } from 'react';

import { Tooltip, TooltipContent } from '@/components/ui/tooltip';

/**
 * The verification tick's tooltip, anchored to the tick. It loads on the
 * first hover or keyboard focus, so profile pages do not carry the tooltip
 * runtime up front; the tick says when it is open.
 */
export function ItemVerificationTooltip({
  anchor,
  open,
  label,
}: {
  anchor: RefObject<HTMLElement | null>;
  open: boolean;
  label: string;
}) {
  return (
    <Tooltip open={open}>
      <TooltipContent anchor={anchor}>{label}</TooltipContent>
    </Tooltip>
  );
}
