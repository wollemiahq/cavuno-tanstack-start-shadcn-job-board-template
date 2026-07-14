'use client';

import { useState } from 'react';

import { boardCopy } from '#/copy';

import { Copy, Link } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { BoardLabelOverrides } from '@cavuno/board/format';

export function CopyLinkButton({
  url,
  language,
  labels,
  size = 'lg',
  className = 'w-full',
}: {
  url: string;
  /** Board language (ISO code) from `board.context()`. */
  language: string;
  /** Operator label overrides (`board.context().labels`), ADR-0059. */
  labels?: BoardLabelOverrides;
  /** Button size — `sm` for the compact hero utility placement. */
  size?: 'sm' | 'md' | 'lg';
  /** Override the default full-width layout (e.g. `w-fit` in the hero). */
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const copy = boardCopy(language, labels).copyLink;
  const buttonSize = size === 'md' ? 'default' : size;
  return (
    <Button
      variant="secondary"
      size={buttonSize}
      className={className}
      aria-label={copy.ariaLabel}
      onClick={async () => {
        // Only claim success if the write actually landed — clipboard is
        // undefined in non-secure contexts and writeText can reject
        // (permission denied in a cross-origin embed).
        try {
          await navigator.clipboard?.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          setCopied(false);
        }
      }}
    >
      {copied ? (
        <Copy data-icon="inline-start" aria-hidden="true" />
      ) : (
        <Link data-icon="inline-start" aria-hidden="true" />
      )}
      {copied ? copy.copiedLabel : copy.copyLinkLabel}
    </Button>
  );
}
