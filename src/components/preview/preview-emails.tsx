'use client';

import { useState } from 'react';

import { ChevronDown, Mail, RotateCw, TriangleAlert } from 'lucide-react';

import type { PreviewEmail } from '../../lib/preview';
import { PREVIEW_EMAILS_DEFAULT_LIMIT } from '../../lib/preview';
import { listSandboxEmails } from '../../server/preview';
import { Prose } from '../prose';
import { HydrationSafeDate } from '../messages/hydration-safe-date';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages';

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

/**
 * The "Emails" panel — a letter_opener-style viewer for the sandbox's captured
 * outbound mail (spec §4b). A Sheet triggered from inside the preview toolbar:
 * every board email (magic links, verification, alert-manage HMAC URLs,
 * digests) is listed newest-first, and expanding a row renders the captured
 * body so a preview session can complete flows that normally need an inbox.
 *
 * Data arrives from the `listSandboxEmails` server function on demand (open /
 * refresh) — the same scriptable seam agents drive headlessly, and the reason
 * it is not preloaded into the root loader on every page. The server fn is
 * sandbox-gated and returns `[]` off the sandbox, so the panel is inert there.
 */
export function PreviewEmailsSheet({ disabled }: { disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<LoadStatus>('idle');
  const [emails, setEmails] = useState<PreviewEmail[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function load() {
    setStatus('loading');
    try {
      const result = await listSandboxEmails({
        data: { limit: PREVIEW_EMAILS_DEFAULT_LIMIT },
      });
      setEmails(result);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    // Lazy first load: only fetch when the panel is actually opened.
    if (next && status === 'idle') void load();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger
        render={
          <Button variant="outline" size="sm" className="w-full" />
        }
        disabled={disabled}
      >
        <Mail data-icon="inline-start" />
        {m.previewToolbar_emails()}
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full gap-0 p-0 sm:max-w-md"
        data-test="preview-emails-panel"
      >
        <SheetHeader className="flex-row items-start justify-between gap-3 p-4">
          <div className="flex min-w-0 flex-col gap-1">
            <SheetTitle>{m.previewToolbar_emailsTitle()}</SheetTitle>
            <SheetDescription>
              {m.previewToolbar_emailsSubtitle()}
            </SheetDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mr-10 shrink-0"
            disabled={status === 'loading'}
            onClick={() => void load()}
            data-test="preview-emails-refresh"
          >
            {status === 'loading' ? (
              <Spinner />
            ) : (
              <RotateCw data-icon="inline-start" />
            )}
            {m.previewToolbar_emailsRefresh()}
          </Button>
        </SheetHeader>

        <Separator />

        <div className="flex-1 overflow-y-auto">
          <PanelBody
            status={status}
            emails={emails}
            expanded={expanded}
            onToggle={(id) =>
              setExpanded((current) => (current === id ? null : id))
            }
            onRetry={() => void load()}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function PanelBody({
  status,
  emails,
  expanded,
  onToggle,
  onRetry,
}: {
  status: LoadStatus;
  emails: PreviewEmail[];
  expanded: string | null;
  onToggle: (id: string) => void;
  onRetry: () => void;
}) {
  if (status === 'loading' && emails.length === 0) {
    return (
      <div
        className="text-muted-foreground flex items-center justify-center gap-2 p-8 text-sm"
        role="status"
      >
        <Spinner className="size-4" />
        {m.previewToolbar_emailsLoading()}
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div
        className="text-destructive bg-destructive/10 m-4 flex flex-col items-start gap-3 rounded-2xl p-4 text-sm"
        role="alert"
      >
        <span className="flex items-center gap-2">
          <TriangleAlert className="size-4 shrink-0" />
          {m.previewToolbar_emailsError()}
        </span>
        <Button variant="outline" size="sm" onClick={onRetry}>
          {m.previewToolbar_emailsRetry()}
        </Button>
      </div>
    );
  }

  if (status === 'ready' && emails.length === 0) {
    return (
      <Empty className="border-0" data-test="preview-emails-empty">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Mail />
          </EmptyMedia>
          <EmptyTitle>{m.previewToolbar_emailsEmpty()}</EmptyTitle>
          <EmptyDescription>
            {m.previewToolbar_emailsEmptyHint()}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ul className="divide-border divide-y" data-test="preview-emails-list">
      {emails.map((email) => (
        <EmailRow
          key={email.id}
          email={email}
          expanded={expanded === email.id}
          onToggle={() => onToggle(email.id)}
        />
      ))}
    </ul>
  );
}

function EmailRow({
  email,
  expanded,
  onToggle,
}: {
  email: PreviewEmail;
  expanded: boolean;
  onToggle: () => void;
}) {
  const hasHtml = email.html.trim().length > 0;
  return (
    <li data-test="preview-email">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="hover:bg-muted flex w-full items-start gap-3 px-4 py-3 text-left transition-colors"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {email.subject}
            </span>
            {email.type ? (
              <Badge variant="secondary" className="shrink-0">
                {email.type}
              </Badge>
            ) : null}
          </span>
          <span className="text-muted-foreground truncate text-xs">
            {m.previewToolbar_emailsTo()} {email.to}
          </span>
        </span>
        <span className="text-muted-foreground flex shrink-0 items-center gap-1 text-xs">
          <HydrationSafeDate
            iso={new Date(email.createdAt).toISOString()}
            presentation="relative"
          />
          <ChevronDown
            className={cn(
              'size-4 transition-transform',
              expanded && 'rotate-180',
            )}
          />
        </span>
      </button>

      {expanded ? (
        <div className="px-4 pb-4" data-test="preview-email-body">
          <div className="bg-background overflow-hidden rounded-2xl border">
            {hasHtml ? (
              <Prose html={email.html} className="max-w-none p-4" />
            ) : (
              <div className="p-4">
                <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
                  {m.previewToolbar_emailsPlainText()}
                </p>
                <pre className="text-foreground font-sans text-sm break-words whitespace-pre-wrap">
                  {email.text ?? ''}
                </pre>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </li>
  );
}
