import type { ComponentPropsWithoutRef } from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type SearchResultCardProps = ComponentPropsWithoutRef<'article'> & {
  selected?: boolean;
};

/** Shared compact interaction chrome; entity components own all card meaning. */
export function SearchResultCard({
  selected = false,
  className,
  ...props
}: SearchResultCardProps) {
  const { children, ...articleProps } = props;

  return (
    <article
      {...articleProps}
      data-slot="search-result-card"
      data-selected={selected}
    >
      <Card
        size="sm"
        data-selected={selected}
        className={cn(
          'hover:bg-accent/50 focus-within:ring-ring/50 data-[selected=true]:bg-accent data-[selected=true]:ring-ring/60 gap-0 py-0 shadow-none transition-colors ring-inset focus-within:ring-2',
          className,
        )}
      >
        <CardContent className="p-0">{children}</CardContent>
      </Card>
    </article>
  );
}
