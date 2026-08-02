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

  // Selection is a `--primary` ring plus a near-transparent tint, NOT a
  // swapped surface. Entity children style with `text-card-foreground` /
  // `text-muted-foreground`, which are tuned against `--card`; the old
  // `data-[selected=true]:bg-accent` stranded them on a surface they were
  // never paired with (a saturated dark theme measured ~1.4:1 on the
  // selected card's location, description and timestamp). Holding the
  // surface at `--card` keeps the selected state legible under ANY preset,
  // and a `--primary` ring among `ring-foreground/5` cards reads at least
  // as loudly as the fill did.
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
          // `dark:data-[selected=true]:` is not redundant: Card's base ring is
          // `ring-foreground/5 dark:ring-foreground/10`, and the single-variant
          // selected ring ties that dark rule on specificity — losing the
          // colour while keeping the width. Stacking both variants wins.
          'hover:bg-accent/50 focus-within:ring-ring/50 data-[selected=true]:bg-primary/5 data-[selected=true]:ring-primary dark:data-[selected=true]:ring-primary gap-0 py-0 transition-[color,background-color,box-shadow] ring-inset focus-within:ring-2 hover:shadow-md data-[selected=true]:ring-2',
          className,
        )}
      >
        <CardContent className="p-0">{children}</CardContent>
      </Card>
    </article>
  );
}
