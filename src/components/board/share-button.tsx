'use client';

/**
 * "Share": the device's share sheet where the browser has one (phones), or
 * the URL copied to the clipboard with the usual "Copied" confirmation.
 */
import { Check, Share } from 'lucide-react';

import { m } from '../../paraglide/messages';

import { useCopyLink } from '@/components/board/copy-link-button';
import { Button } from '@/components/ui/button';
import { copyLinkCopy } from '@/copy-groups/copy-link';

export function ShareButton({
  url,
  title,
  className,
}: {
  url: string;
  /** The shared page's title, offered to the share sheet. */
  title: string;
  className?: string;
}) {
  const { copied, copyLink } = useCopyLink(url);
  const copy = copyLinkCopy();

  async function share() {
    const data = { url, title };
    if ('share' in navigator && (navigator.canShare?.(data) ?? true)) {
      try {
        await navigator.share(data);
        return;
      } catch (error) {
        // Closing the sheet is the person's answer, not a failure.
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        // Refused (no user activation, policy): copy instead.
      }
    }
    await copyLink();
  }

  return (
    <>
      <Button
        variant="outline"
        size="lg"
        className={className}
        onClick={() => void share()}
      >
        {copied ? (
          <Check data-icon="inline-start" aria-hidden="true" />
        ) : (
          <Share data-icon="inline-start" aria-hidden="true" />
        )}
        {copied ? copy.copiedLabel : m.product_shareAction()}
      </Button>
      {/* Out of the button, so its name stays the label shown. */}
      <span role="status" className="sr-only">
        {copied ? copy.copiedLabel : ''}
      </span>
    </>
  );
}
