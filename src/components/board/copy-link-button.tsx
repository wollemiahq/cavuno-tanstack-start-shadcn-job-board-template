'use client';

import { useState } from 'react';

import { Copy01, Link01 } from '@untitledui/icons';

import { boardCopy } from '#/copy';

import { Button } from '@/components/base/buttons/button';
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
  return (
    <Button
      color="secondary"
      size={size}
      className={className}
      iconLeading={copied ? Copy01 : Link01}
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
      {copied ? copy.copiedLabel : copy.copyLinkLabel}
    </Button>
  );
}
