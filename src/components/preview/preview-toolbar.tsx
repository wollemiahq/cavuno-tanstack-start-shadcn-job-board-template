'use client';

import { useState } from 'react';

import {
  Check,
  ChevronsUpDown,
  Eye,
  LogOut,
  Mail,
  RotateCcw,
  Settings,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';

import {
  serializeDataSourceCookie,
  type DataSource,
} from '../../lib/data-source';
import {
  groupPersonasByRole,
  type PreviewBoardConfig,
  type PreviewCapability,
  type PreviewPersona,
  type PreviewViewer,
} from '../../lib/preview';
import { m } from '../../paraglide/messages';
import {
  exitPreview,
  reseedSandbox,
  switchPersona,
} from '../../server/preview';
import { PreviewBoardSettingsSheet } from './preview-board-settings';
import { PreviewEmailsSheet } from './preview-emails';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

/**
 * The developer-preview toolbar for the sandbox preview state
 * spec. A floating, unobtrusive pill that renders ONLY when the server-side
 * capability check passes (`sandbox: true`), never on a tenant board.
 *
 * Dual-source (DMO-01): when `CAVUNO_DEMO_BOARD` is configured, the persona
 * menu gains a top "Your board (real data)" entry that sets the data-source
 * cookie to `board`. Choosing any persona sets it to `demo` then runs the
 * existing switchPersona flow. Exit preview clears the persona session but
 * stays in demo mode. Board-settings + reseed are hidden on shared public
 * demo fixtures (`CAVUNO_DEMO_BOARD_PRIVATE` unset) and shown for private
 * shadows (`=1`).
 *
 * Information architecture (Stripe test-mode helper pattern): the pill anchors
 * a persistent mode indicator whose PRIMARY surface does one job — switch
 * persona / data source. Everything else is progressive disclosure behind the
 * popover's footer action row, each in its own focused surface:
 *   - Board settings → its own sheet (`PreviewBoardSettingsSheet`)
 *   - Emails         → its own sheet (`PreviewEmailsSheet`)
 *   - Reseed         → a confirm dialog
 *   - Exit preview   → immediate sign-out + reload
 * Opening any of them dismisses the persona menu; closing them returns to
 * nothing (never re-opens the menu). The same server functions are scriptable
 * headlessly for agents.
 *
 * Positioned bottom-LEFT to clear the app's own bottom-right chrome (the
 * messages dock at `right-6 bottom-0`, the job-alert prompt at `right-4
 * bottom-4`) — "must not collide with the app's own chrome" wins over the
 * nominal bottom-right ask.
 */
export function PreviewToolbar({
  capability,
  personas,
  viewer,
  config,
  demoConfigured = false,
  demoBoardPrivate = false,
  dataSource = 'board',
}: {
  capability: PreviewCapability;
  personas: PreviewPersona[];
  viewer: PreviewViewer | null;
  config: PreviewBoardConfig;
  /** Builder injected `CAVUNO_DEMO_BOARD`. */
  demoConfigured?: boolean;
  /** `CAVUNO_DEMO_BOARD_PRIVATE=1` — private shadow allows reseed/settings. */
  demoBoardPrivate?: boolean;
  /** Effective data source for this request. */
  dataSource?: DataSource;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const [boardSettingsOpen, setBoardSettingsOpen] = useState(false);
  const [emailsOpen, setEmailsOpen] = useState(false);
  const [reseedOpen, setReseedOpen] = useState(false);
  const [reseeding, setReseeding] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [stalePersona, setStalePersona] = useState<string | null>(null);

  // Full sandbox preview (personas/emails/settings) needs canPreview. Dual-
  // source escape hatch: when the demo key is configured we still render so
  // the user can always return to "Your board" even if the preview RPC failed
  // (canPreview false, empty roster).
  if (!capability.canPreview && !demoConfigured) return null;

  const previewLive = capability.canPreview;

  // Legacy sandbox-on-primary always shows mutating tools. Dual-source: only
  // while viewing demo data on a private shadow — never on "Your board"
  // (would PATCH demo from primary config) and never on shared fixtures.
  // Also require live preview capability (RPC healthy).
  const showBoardControls =
    previewLive &&
    (!demoConfigured || (demoBoardPrivate && dataSource === 'demo'));

  const busy = switching !== null || reseeding || exiting;
  const grouped = groupPersonasByRole(previewLive ? personas : []);
  const onYourBoard = demoConfigured && dataSource === 'board';
  const viewerLabel = onYourBoard
    ? m.previewToolbar_yourBoard()
    : (viewer?.displayName ?? viewer?.email ?? m.previewToolbar_anonymous());

  function writeDataSourceCookie(source: DataSource) {
    // UI preference — not httpOnly; Path=/ SameSite=Lax.
    document.cookie = serializeDataSourceCookie(source);
  }

  async function onSelectYourBoard() {
    writeDataSourceCookie('board');
    // Full reload so every loader re-reads against the primary client.
    window.location.reload();
  }

  async function onSwitch(persona: PreviewPersona) {
    setStalePersona(null);
    setSwitching(persona.id);
    try {
      const result = await switchPersona({ data: { personaId: persona.id } });
      if (result.ok) {
        // R1: only flip the data-source cookie AFTER a successful switch so a
        // failed RPC never leaves the browser on demo data with board chrome.
        if (demoConfigured) {
          writeDataSourceCookie('demo');
        }
        // Full reload, not router.invalidate(): a persona switch changes the
        // viewer identity, and every client-held surface (open dock threads,
        // polled inbox state, loader caches) must reset with it — invalidate
        // alone left the previous persona's thread visible (user-reported).
        window.location.reload();
        return;
      } else if (result.code === 'persona-unavailable') {
        // Reseeded out from under a stale menu.
        setStalePersona(persona.id);
      }
    } finally {
      setSwitching(null);
    }
  }

  async function onReseed() {
    setReseeding(true);
    try {
      await reseedSandbox();
      // Reseed purges and recreates the personas — the CURRENT session's
      // board user is among the purged, so the viewer's own session is now
      // stale by construction. Reload lands on the honest signed-out state.
      window.location.reload();
    } finally {
      setReseeding(false);
    }
  }

  async function onExit() {
    setExiting(true);
    try {
      await exitPreview();
      // Dual-source: exit clears the persona session but leaves the
      // data-source cookie alone (stays in demo mode).
      window.location.reload();
    } finally {
      setExiting(false);
    }
  }

  // Footer actions each dismiss the persona menu, then open their own surface —
  // so closing that surface returns to nothing, never back to the menu.
  function openBoardSettings() {
    setMenuOpen(false);
    setBoardSettingsOpen(true);
  }
  function openEmails() {
    setMenuOpen(false);
    setEmailsOpen(true);
  }
  function openReseed() {
    setMenuOpen(false);
    setReseedOpen(true);
  }
  function handleExit() {
    setMenuOpen(false);
    void onExit();
  }

  return (
    <div
      className="fixed bottom-4 left-4 z-(--z-preview-toolbar) print:hidden"
      data-test="preview-toolbar"
    >
      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              className="rounded-full shadow-lg"
              aria-label={m.previewToolbar_triggerLabel()}
            />
          }
        >
          <Eye data-icon="inline-start" className="text-muted-foreground" />
          <span className="text-muted-foreground">
            {m.previewToolbar_viewingAs()}
          </span>
          <span className="font-medium">{viewerLabel}</span>
          <ChevronsUpDown
            data-icon="inline-end"
            className="text-muted-foreground"
          />
        </PopoverTrigger>
        <PopoverContent
          align="start"
          side="top"
          className="w-80 gap-0 p-0"
          data-test="preview-panel"
        >
          <div className="flex items-center justify-between gap-2 p-3">
            <div className="flex flex-col">
              <span className="text-sm font-medium">
                {m.previewToolbar_title()}
              </span>
              <span className="text-muted-foreground text-xs">
                {m.previewToolbar_subtitle()}
              </span>
            </div>
            <Badge variant="secondary">{m.previewToolbar_sandboxBadge()}</Badge>
          </div>

          <Separator />

          {stalePersona ? (
            <div
              className="text-destructive bg-destructive/10 m-3 flex items-start gap-2 rounded-2xl p-3 text-xs"
              role="alert"
            >
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <span>{m.previewToolbar_staleReseed()}</span>
            </div>
          ) : null}

          <div
            className="max-h-72 overflow-y-auto p-2"
            data-test="preview-personas"
          >
            {demoConfigured ? (
              <div className="mb-1">
                <button
                  type="button"
                  disabled={busy}
                  aria-current={onYourBoard || undefined}
                  aria-label={m.previewToolbar_yourBoard()}
                  data-test="preview-your-board"
                  onClick={() => void onSelectYourBoard()}
                  className={cn(
                    'hover:bg-muted flex w-full items-start gap-2 rounded-2xl px-2 py-1.5 text-left transition-colors disabled:pointer-events-none disabled:opacity-50',
                    onYourBoard && 'bg-muted',
                  )}
                >
                  <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center">
                    {onYourBoard ? (
                      <Check className="text-primary size-3.5" />
                    ) : null}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="text-sm font-medium">
                      {m.previewToolbar_yourBoard()}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {m.previewToolbar_yourBoardHint()}
                    </span>
                  </span>
                </button>
              </div>
            ) : null}
            {previewLive ? (
              <>
                <PersonaGroup
                  label={m.previewToolbar_candidates()}
                  personas={grouped.candidate}
                  viewer={onYourBoard ? null : viewer}
                  switching={switching}
                  disabled={busy}
                  onSwitch={onSwitch}
                />
                <PersonaGroup
                  label={m.previewToolbar_employers()}
                  personas={grouped.employer}
                  viewer={onYourBoard ? null : viewer}
                  switching={switching}
                  disabled={busy}
                  onSwitch={onSwitch}
                />
                {personas.length === 0 ? (
                  <p className="text-muted-foreground p-2 text-xs">
                    {m.previewToolbar_noPersonas()}
                  </p>
                ) : null}
              </>
            ) : null}
          </div>

          {previewLive ? (
            <>
              <Separator />

              {/* Compact toolbar of secondary tools — each opens its own surface. */}
              <div
                className="grid grid-cols-2 gap-1 p-2"
                data-test="preview-actions"
              >
                {showBoardControls ? (
                  <FooterAction
                    icon={Settings}
                    label={m.previewToolbar_boardSettings()}
                    disabled={busy}
                    onClick={openBoardSettings}
                  />
                ) : null}
                <FooterAction
                  icon={Mail}
                  label={m.previewToolbar_emails()}
                  disabled={busy}
                  onClick={openEmails}
                />
                {showBoardControls ? (
                  <FooterAction
                    icon={RotateCcw}
                    label={m.previewToolbar_reseed()}
                    disabled={busy}
                    onClick={openReseed}
                  />
                ) : null}
                <FooterAction
                  icon={exiting ? undefined : LogOut}
                  label={m.previewToolbar_exit()}
                  disabled={busy || !viewer || onYourBoard}
                  onClick={handleExit}
                />
              </div>
            </>
          ) : null}
        </PopoverContent>
      </Popover>

      {/* Secondary surfaces — siblings of the menu, so they persist after it
          closes and closing them returns to nothing. */}
      {showBoardControls ? (
        <PreviewBoardSettingsSheet
          config={config}
          open={boardSettingsOpen}
          onOpenChange={setBoardSettingsOpen}
        />
      ) : null}

      <PreviewEmailsSheet open={emailsOpen} onOpenChange={setEmailsOpen} />

      {showBoardControls ? (
        <AlertDialog open={reseedOpen} onOpenChange={setReseedOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {m.previewToolbar_reseedConfirmTitle()}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {m.previewToolbar_reseedConfirmBody()}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={reseeding}>
                {m.previewToolbar_cancel()}
              </AlertDialogCancel>
              <AlertDialogAction disabled={reseeding} onClick={onReseed}>
                {reseeding ? <Spinner /> : null}
                {m.previewToolbar_reseed()}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </div>
  );
}

/**
 * One small icon+label button in the popover footer's action row. The visible
 * label is the button's accessible name; `icon` is optional so the Exit action
 * can swap in a spinner while its request is in flight.
 */
function FooterAction({
  icon: Icon,
  label,
  disabled,
  onClick,
}: {
  icon?: LucideIcon;
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="justify-start"
      disabled={disabled}
      onClick={onClick}
    >
      {Icon ? <Icon data-icon="inline-start" /> : <Spinner />}
      {label}
    </Button>
  );
}

function PersonaGroup({
  label,
  personas,
  viewer,
  switching,
  disabled,
  onSwitch,
}: {
  label: string;
  personas: PreviewPersona[];
  viewer: PreviewViewer | null;
  switching: string | null;
  disabled: boolean;
  onSwitch: (persona: PreviewPersona) => void;
}) {
  if (personas.length === 0) return null;
  return (
    <div className="mb-1">
      <p className="text-muted-foreground px-2 py-1 text-xs font-medium tracking-wide uppercase">
        {label}
      </p>
      <ul>
        {personas.map((persona) => {
          // Best-effort "current" marker: the browser-safe roster carries no
          // email (credentials are server-only), so match on displayName.
          const active =
            viewer?.displayName != null &&
            viewer.displayName === persona.displayName;
          const isSwitching = switching === persona.id;
          return (
            <li key={persona.id}>
              <button
                type="button"
                disabled={disabled}
                aria-current={active || undefined}
                aria-label={`${persona.displayName}, ${persona.description}`}
                data-test="preview-persona"
                onClick={() => onSwitch(persona)}
                className={cn(
                  'hover:bg-muted flex w-full items-start gap-2 rounded-2xl px-2 py-1.5 text-left transition-colors disabled:pointer-events-none disabled:opacity-50',
                  active && 'bg-muted',
                )}
              >
                <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center">
                  {isSwitching ? (
                    <Spinner className="size-3.5" />
                  ) : active ? (
                    <Check className="text-primary size-3.5" />
                  ) : null}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-sm font-medium">
                    {persona.displayName}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {persona.description}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
