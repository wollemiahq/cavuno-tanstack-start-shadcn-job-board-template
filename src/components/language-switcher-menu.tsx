'use client';

import { Check, ChevronDown, Globe } from 'lucide-react';

import type { LocaleOption } from '@/components/language-switcher';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export function LanguageSwitcherMenu({
  options,
  activeLabel,
  label,
  className,
}: {
  options: LocaleOption[];
  activeLabel: string;
  label: string;
  className?: string;
}) {
  return (
    <DropdownMenu defaultOpen>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label={label}
            className={cn('gap-2', className)}
            data-test="language-switcher"
          />
        }
      >
        <Globe className="text-muted-foreground" />
        <span>{activeLabel}</span>
        <ChevronDown className="text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        {options.map((option) => (
          <DropdownMenuItem
            key={option.locale}
            nativeButton={false}
            aria-current={option.active ? 'true' : undefined}
            render={<a href={option.href} hrefLang={option.locale} />}
          >
            <span className="flex-1">{option.label}</span>
            {option.active ? <Check /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
