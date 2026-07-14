import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        'bg-muted animate-pulse rounded-2xl motion-reduce:animate-none',
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
