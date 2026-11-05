import type { ReactElement } from 'react';

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/**
 * The verified tick's tooltip, split out so the tooltip code loads after the
 * page instead of with it. `tick` is the same element the page shows while
 * this loads.
 */
export function VerifiedTickTooltip({
  tick,
  text,
}: {
  tick: ReactElement;
  text: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger render={tick} />
      <TooltipContent>{text}</TooltipContent>
    </Tooltip>
  );
}
