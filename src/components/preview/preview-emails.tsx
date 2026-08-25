'use client';

import { useCallback, useEffect, useState } from 'react';

import { ChevronLeft, Mail, RotateCw, TriangleAlert } from 'lucide-react';

import { PREVIEW_EMAILS_DEFAULT_LIMIT } from '../../lib/preview';
import { m } from '../../paraglide/messages';
import { listSandboxEmails } from '../../server/preview';
import { HydrationSafeDate } from '../messages/hydration-safe-date';

import type { PreviewEmail } from '../../lib/preview';
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

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

export type LoadPreviewEmails = (
  input: Parameters<typeof listSandboxEmails>[0],
) => ReturnType<typeof listSandboxEmails>;

/**
 * The "Emails" panel — a Mailpit/letter_opener-style viewer for the sandbox's
 * captured outbound mail. A Sheet triggered from inside the preview
 * toolbar: every board email (magic links, verification, alert-manage HMAC
 * URLs, digests) is listed newest-first in a compact master list, and
 * selecting one opens a workbench detail — a metadata header (To / Subject /
 * Type / Received) above the rendered body — so a preview session can complete
 * flows that normally need an inbox.
 *
 * The body is framed in a SANDBOXED iframe (`srcdoc`, `sandbox=""`, no
 * scripts): an email is a standalone document, so framing it keeps its own
 * inline styles from bleeding into the app and keeps the app's styles from
 * distorting it. AGENTS.md hard rule 4 holds — the platform HTML is handed to
 * `srcDoc` as-is, never interpolated with other strings.
 *
 * Data arrives from the `listSandboxEmails` server function on demand (open /
 * refresh) — the same scriptable seam agents drive headlessly, and the reason
 * it is not preloaded into the root loader on every page. The server fn is
 * sandbox-gated and returns `[]` off the sandbox, so the panel is inert there.
 */
export function PreviewEmailsSheet({
  disabled,
  open: openProp,
  onOpenChange: onOpenChangeProp,
  loadEmails = listSandboxEmails,
}: {
  disabled?: boolean;
  /**
   * Controlled mode — the toolbar opens this sheet from its footer envelope,
   * so the default full-width trigger is suppressed. When omitted the sheet is
   * uncontrolled and renders its own trigger button (used in isolation / tests).
   */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  loadEmails?: LoadPreviewEmails;
}) {
  const controlled = openProp !== undefined;
  const [openState, setOpenState] = useState(false);
  const open = controlled ? openProp : openState;
  const [status, setStatus] = useState<LoadStatus>('idle');
  const [emails, setEmails] = useState<PreviewEmail[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const result = await loadEmails({
        data: { limit: PREVIEW_EMAILS_DEFAULT_LIMIT },
      });
      setEmails(result);
      // Auto-open the newest capture so the workbench lands on a body, not an
      // empty detail pane; the master list stays the way back.
      setSelectedId(result[0]?.id ?? null);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [loadEmails]);

  // Lazy first load whenever the panel opens with nothing fetched yet — works
  // in both controlled (toolbar-driven) and uncontrolled (own-trigger) modes.
  useEffect(() => {
    if (open && status === 'idle') void load();
  }, [open, status, load]);

  function onOpenChange(next: boolean) {
    if (!controlled) setOpenState(next);
    onOpenChangeProp?.(next);
  }

  const selected = emails.find((email) => email.id === selectedId) ?? null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {controlled ? null : (
        <SheetTrigger
          render={<Button variant="outline" size="sm" className="w-full" />}
          disabled={disabled}
        >
          <Mail data-icon="inline-start" />
          {m.previewToolbar_emails()}
        </SheetTrigger>
      )}
      <SheetContent
        side="right"
        className="w-full gap-0 p-0 sm:max-w-2xl lg:max-w-3xl"
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
            className="me-10 shrink-0"
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

        <PanelBody
          status={status}
          emails={emails}
          selected={selected}
          onSelect={setSelectedId}
          onBack={() => setSelectedId(null)}
          onRetry={() => void load()}
        />
      </SheetContent>
    </Sheet>
  );
}

function PanelBody({
  status,
  emails,
  selected,
  onSelect,
  onBack,
  onRetry,
}: {
  status: LoadStatus;
  emails: PreviewEmail[];
  selected: PreviewEmail | null;
  onSelect: (id: string) => void;
  onBack: () => void;
  onRetry: () => void;
}) {
  if (status === 'loading' && emails.length === 0) {
    return (
      <div
        className="text-muted-foreground flex flex-1 items-center justify-center gap-2 p-8 text-sm"
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
      <Empty className="flex-1 border-0" data-test="preview-emails-empty">
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
    <div className="flex min-h-0 w-full flex-1">
      <ul
        className={cn(
          'flex min-h-0 w-full flex-col overflow-y-auto sm:w-72 sm:shrink-0 sm:border-e',
          selected && 'hidden sm:flex',
        )}
        data-test="preview-emails-list"
      >
        {emails.map((email) => (
          <EmailListRow
            key={email.id}
            email={email}
            selected={selected?.id === email.id}
            onSelect={() => onSelect(email.id)}
          />
        ))}
      </ul>

      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col',
          !selected && 'hidden sm:flex',
        )}
        data-test="preview-email-detail"
      >
        {selected ? (
          <EmailDetail email={selected} onBack={onBack} />
        ) : (
          <div className="text-muted-foreground flex flex-1 items-center justify-center p-8 text-sm">
            {m.previewToolbar_emailsSelectHint()}
          </div>
        )}
      </div>
    </div>
  );
}

function EmailListRow({
  email,
  selected,
  onSelect,
}: {
  email: PreviewEmail;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <li data-test="preview-email">
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected || undefined}
        className={cn(
          'hover:bg-muted border-border flex w-full flex-col gap-1 border-b px-4 py-3 text-start transition-colors',
          selected && 'bg-muted',
        )}
      >
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
        <span className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground min-w-0 flex-1 truncate font-mono text-xs">
            {email.to}
          </span>
          <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
            <HydrationSafeDate
              iso={new Date(email.createdAt).toISOString()}
              presentation="relative"
            />
          </span>
        </span>
      </button>
    </li>
  );
}

function EmailDetail({
  email,
  onBack,
}: {
  email: PreviewEmail;
  onBack: () => void;
}) {
  const iso = new Date(email.createdAt).toISOString();
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center border-b p-2 sm:hidden">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft data-icon="inline-start" />
          {m.previewToolbar_emailsBack()}
        </Button>
      </div>

      <dl className="grid gap-2.5 p-4">
        <MetaRow label={m.previewToolbar_emailsTo()} mono>
          {email.to}
        </MetaRow>
        <MetaRow label={m.previewToolbar_emailsSubject()}>
          {email.subject}
        </MetaRow>
        {email.type ? (
          <MetaRow label={m.previewToolbar_emailsType()}>
            <Badge variant="secondary">{email.type}</Badge>
          </MetaRow>
        ) : null}
        <MetaRow label={m.previewToolbar_emailsReceived()} mono>
          <HydrationSafeDate iso={iso} presentation="day" />
          {' · '}
          <HydrationSafeDate iso={iso} presentation="clock" />
        </MetaRow>
      </dl>

      <Separator />

      <EmailBody email={email} />
    </div>
  );
}

/** One definition-list row in the metadata header. */
function MetaRow({
  label,
  mono,
  children,
}: {
  label: string;
  mono?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[5.5rem_1fr] items-start gap-3">
      <dt className="text-muted-foreground pt-px text-xs font-medium">
        {label}
      </dt>
      <dd
        className={cn(
          'min-w-0 text-sm break-words',
          mono && 'font-mono text-xs tabular-nums',
        )}
      >
        {children}
      </dd>
    </div>
  );
}

/**
 * The captured body. When HTML is present it is framed in a sandboxed iframe —
 * `srcDoc` receives the server-retargeted platform HTML (AGENTS.md rule 4:
 * rendered as-is apart from the viewer-only link transform). The sandbox
 * allows only user-activated top-level navigation, so local completion links
 * can escape the mail pane while scripts and same-origin access stay blocked.
 * The frame carries
 * a fixed height with its own internal scroll (a `sandbox=""` frame can't be
 * measured cross-origin for auto-height), centred on a muted backdrop with a
 * white card to mimic an email client. When HTML is empty the plain-text
 * fallback renders in a themed `<pre>` block instead.
 */
function EmailBody({ email }: { email: PreviewEmail }) {
  const hasHtml = email.html.trim().length > 0;
  return (
    <div
      className="bg-muted min-h-0 flex-1 overflow-y-auto p-4"
      data-test="preview-email-body"
    >
      {hasHtml ? (
        <div className="mx-auto max-w-[640px] overflow-hidden rounded-2xl border bg-white shadow-sm">
          <iframe
            title={m.previewToolbar_emailsBodyLabel()}
            srcDoc={email.html}
            sandbox="allow-top-navigation-by-user-activation"
            className="block h-[32rem] w-full bg-white"
          />
        </div>
      ) : (
        <div className="bg-background mx-auto max-w-[640px] rounded-2xl border p-4 shadow-sm">
          <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
            {m.previewToolbar_emailsPlainText()}
          </p>
          <pre className="text-foreground font-mono text-sm break-words whitespace-pre-wrap">
            {email.text ?? ''}
          </pre>
        </div>
      )}
    </div>
  );
}
