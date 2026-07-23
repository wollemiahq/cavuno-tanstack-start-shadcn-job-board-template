import * as React from 'react';

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
} from 'lucide-react';

import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { VariantProps } from 'class-variance-authority';

function Pagination({
  className,
  ...props
}: React.ComponentProps<'nav'> & { 'aria-label': string }) {
  return (
    <nav
      role="navigation"
      data-slot="pagination"
      className={cn('mx-auto flex w-full justify-center', className)}
      {...props}
    />
  );
}

function PaginationContent({
  className,
  ...props
}: React.ComponentProps<'ul'>) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn('flex items-center gap-1', className)}
      {...props}
    />
  );
}

function PaginationItem({ ...props }: React.ComponentProps<'li'>) {
  return <li data-slot="pagination-item" {...props} />;
}

type PaginationLinkProps = {
  isActive?: boolean;
} & Pick<VariantProps<typeof buttonVariants>, 'size'> &
  React.ComponentProps<'a'>;

function PaginationLink({
  className,
  isActive,
  size = 'icon',
  ...props
}: PaginationLinkProps) {
  return (
    <a
      aria-current={isActive ? 'page' : undefined}
      data-slot="pagination-link"
      data-active={isActive}
      className={cn(
        buttonVariants({ variant: isActive ? 'outline' : 'ghost', size }),
        className,
      )}
      {...props}
    />
  );
}

function PaginationPrevious({
  className,
  text,
  showText = true,
  ...props
}: React.ComponentProps<typeof PaginationLink> & {
  text: string;
  showText?: boolean;
}) {
  return (
    <PaginationLink
      aria-label={text}
      size="default"
      className={className}
      {...props}
    >
      <ChevronLeftIcon className="rtl:rotate-180" data-icon="inline-start" />
      <span className={cn('hidden sm:block', !showText && 'hidden!')}>
        {text}
      </span>
    </PaginationLink>
  );
}

function PaginationNext({
  className,
  text,
  showText = true,
  ...props
}: React.ComponentProps<typeof PaginationLink> & {
  text: string;
  showText?: boolean;
}) {
  return (
    <PaginationLink
      aria-label={text}
      size="default"
      className={className}
      {...props}
    >
      <span className={cn('hidden sm:block', !showText && 'hidden!')}>
        {text}
      </span>
      <ChevronRightIcon className="rtl:rotate-180" data-icon="inline-end" />
    </PaginationLink>
  );
}

function PaginationEllipsis({
  className,
  ...props
}: React.ComponentProps<'span'>) {
  return (
    <span
      aria-hidden
      data-slot="pagination-ellipsis"
      className={cn(
        "flex size-8 items-center justify-center [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      <MoreHorizontalIcon />
    </span>
  );
}

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
};
