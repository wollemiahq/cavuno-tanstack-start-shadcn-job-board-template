'use client';

import { Badge } from '@/components/ui/badge';
import { localizePath } from '@/lib/localized-path';
import { cn } from '@/lib/utils';

export interface TaxonomyChip {
  key: string;
  name: string;
  href: string;
}

const chipSize = {
  sm: 'h-5 px-2 text-xs',
  md: 'h-6 px-2.5 text-sm',
  lg: 'h-7 px-3 text-sm',
};

export function TaxonomyTags({
  chips,
  overflow = 0,
  size = 'md',
  className,
  openInNewTab = false,
}: {
  chips: TaxonomyChip[];
  overflow?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  /** Embed widgets pass true so chips leave the iframe. */
  openInNewTab?: boolean;
}) {
  if (chips.length === 0 && overflow <= 0) return null;

  const newTabProps = openInNewTab
    ? { target: '_blank' as const, rel: 'noopener noreferrer' }
    : {};

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {chips.map((chip) => (
        <Badge
          key={chip.key}
          render={<a href={localizePath(chip.href)} {...newTabProps} />}
          variant="outline"
          className={cn(chipSize[size], 'hover:no-underline')}
        >
          {chip.name}
        </Badge>
      ))}
      {overflow > 0 ? (
        <Badge variant="outline" className={chipSize[size]}>
          +{overflow}
        </Badge>
      ) : null}
    </div>
  );
}
