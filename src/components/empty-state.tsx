import type { ReactNode } from 'react';

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { cn } from '@/lib/utils';

/**
 * The canonical page/collection empty surface (see
 * docs/patterns/empty-state.md): a featured icon badge, a title, a
 * description, and one optional action, vertically centred in a consistent
 * `min-h-96` so "no saved jobs", "no applications", "no job alerts", and the
 * employer's "no jobs" all read at the same scale and placement instead of
 * each hand-rolling its own height and action styling.
 *
 * Pass the action as a real Button (or a button-styled Link for navigation)
 * with a consistent variant — the board uses `outline` for the single
 * recovery action. Multi-action access gates and full-canvas search
 * not-found surfaces keep their own wrappers (JobsNotFound / SalaryEmptyState
 * / the restricted-directory gate) rather than this single-action shape.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: ReactNode;
  title: ReactNode;
  description: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <Empty className={cn('min-h-96 border-0', className)}>
      <EmptyHeader>
        <EmptyMedia variant="icon">{icon}</EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {action ? <EmptyContent>{action}</EmptyContent> : null}
    </Empty>
  );
}
