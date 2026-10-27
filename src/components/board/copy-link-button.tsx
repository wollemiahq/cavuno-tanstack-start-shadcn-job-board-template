'use client';

import { useState } from 'react';

import { Copy, Link } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { copyLinkCopy } from '@/copy-groups/copy-link';

/**
 * Copy a URL to the clipboard and say so for two seconds. Only claims
 * success if the write actually landed: clipboard is undefined in non-secure
 * contexts and writeText can reject (permission denied in a cross-origin
 * embed).
 */
export function useCopyLink(url: string) {
  const [copied, setCopied] = useState(false);
  async function copyLink() {
    try {
      if (!navigator.clipboard) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }
  return { copied, copyLink };
}

export function CopyLinkButton({
  url,
  size = 'lg',
  className = 'w-full',
}: {
  url: string;
  /** Board language (ISO code) from `board.context()`. */
  language: string;
  /** Button size — `sm` for the compact hero utility placement. */
  size?: 'sm' | 'md' | 'lg';
  /** Override the default full-width layout (e.g. `w-fit` in the hero). */
  className?: string;
}) {
  const { copied, copyLink } = useCopyLink(url);
  const copy = copyLinkCopy();
  const buttonSize = size === 'md' ? 'default' : size;
  return (
    <Button
      variant="secondary"
      size={buttonSize}
      className={className}
      aria-label={copy.ariaLabel}
      onClick={() => void copyLink()}
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
