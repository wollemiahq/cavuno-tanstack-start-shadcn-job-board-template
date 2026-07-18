'use client';

import { useState } from 'react';

import { useRouter } from '@tanstack/react-router';
import {
  Check,
  ChevronsUpDown,
  Eye,
  LogOut,
  RotateCcw,
  TriangleAlert,
} from 'lucide-react';

import {
  groupPersonasByRole,
  PREVIEW_FEATURE_FLAGS,
  type PreviewBoardConfig,
  type PreviewCapability,
  type PreviewFeatureFlag,
  type PreviewPersona,
  type PreviewViewer,
  type TalentDirectoryVisibility,
} from '../../lib/preview';
import {
  exitPreview,
  reseedSandbox,
  switchPersona,
  updateSandboxFlags,
} from '../../server/preview';
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
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages';

/**
 * The developer-preview toolbar — Workstream B of the sandbox-preview-state
 * spec. A floating, unobtrusive pill that renders ONLY when the server-side
 * capability check passes (`sandbox: true`), never on a tenant board.
 *
 * It is the discoverability skin over the persona-switch seam; the same
 * server functions are scriptable headlessly for agents (spec §3.7).
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
}: {
  capability: PreviewCapability;
  personas: PreviewPersona[];
  viewer: PreviewViewer | null;
  config: PreviewBoardConfig;
}) {
  const router = useRouter();
  const [switching, setSwitching] = useState<string | null>(null);
  const [pendingFlag, setPendingFlag] = useState<string | null>(null);
  const [flagError, setFlagError] = useState(false);
  const [reseedOpen, setReseedOpen] = useState(false);
  const [reseeding, setReseeding] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [stalePersona, setStalePersona] = useState<string | null>(null);

  // Server-verified: the toolbar can never render on a real board. This is a
  // defensive second gate — the root layout already withholds it off-sandbox.
  if (!capability.canPreview) return null;

  const busy = switching !== null || reseeding || exiting;
  const grouped = groupPersonasByRole(personas);
  const viewerLabel =
    viewer?.displayName ?? viewer?.email ?? m.previewToolbar_anonymous();

  async function onSwitch(persona: PreviewPersona) {
    setStalePersona(null);
    setSwitching(persona.id);
    try {
      const result = await switchPersona({ data: { personaId: persona.id } });
      if (result.ok) {
        await router.invalidate();
      } else if (result.code === 'persona-unavailable') {
        // Reseeded out from under a stale menu (spec §4b item 3).
        setStalePersona(persona.id);
      }
    } finally {
      setSwitching(null);
    }
  }

  /**
   * Toggle one board-config key. On failure — a rejected PATCH (the flag module
   * or platform whitelist drifted) or a typed `not-sandbox` result — surface the
   * error banner and DON'T invalidate: the control stays bound to the current
   * `config` prop, so it reverts to its real value rather than sticking at the
   * value the user just picked. Wrapped so a 4xx never unhandled-rejects.
   */
  async function onSetFlag(
    key: string,
    next: boolean | TalentDirectoryVisibility,
  ) {
    setFlagError(false);
    setPendingFlag(key);
    try {
      const result = await updateSandboxFlags({
        data: { config: { [key]: next } },
      });
      if (result.ok) {
        await router.invalidate();
      } else {
        setFlagError(true);
      }
    } catch {
      setFlagError(true);
    } finally {
      setPendingFlag(null);
    }
  }

  async function onReseed() {
    setReseeding(true);
    try {
      await reseedSandbox();
      setStalePersona(null);
      await router.invalidate();
      setReseedOpen(false);
    } finally {
      setReseeding(false);
    }
  }

  async function onExit() {
    setExiting(true);
    try {
      await exitPreview();
      await router.invalidate();
    } finally {
      setExiting(false);
    }
  }

  return (
    <div
      className="fixed bottom-4 left-4 z-[60] print:hidden"
      data-test="preview-toolbar"
    >
      <Popover>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              className="rounded-full shadow-lg"
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
            <PersonaGroup
              label={m.previewToolbar_candidates()}
              personas={grouped.candidate}
              viewer={viewer}
              switching={switching}
              disabled={busy}
              onSwitch={onSwitch}
            />
            <PersonaGroup
              label={m.previewToolbar_employers()}
              personas={grouped.employer}
              viewer={viewer}
              switching={switching}
              disabled={busy}
              onSwitch={onSwitch}
            />
            {personas.length === 0 ? (
              <p className="text-muted-foreground p-2 text-xs">
                {m.previewToolbar_noPersonas()}
              </p>
            ) : null}
          </div>

          <Separator />

          <div className="p-3">
            <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
              {m.previewToolbar_boardSettings()}
            </p>
            {flagError ? (
              <div
                className="text-destructive bg-destructive/10 mb-3 flex items-start gap-2 rounded-2xl p-3 text-xs"
                role="alert"
              >
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                <span>{m.previewToolbar_flagError()}</span>
              </div>
            ) : null}
            <ul className="flex flex-col gap-3">
              {PREVIEW_FEATURE_FLAGS.map((flag) => (
                <FlagControl
                  key={flag.key}
                  flag={flag}
                  config={config}
                  disabled={busy}
                  pending={pendingFlag === flag.key}
                  onSet={onSetFlag}
                />
              ))}
            </ul>
          </div>

          <Separator />

          <div className="p-3">
            <PreviewEmailsSheet disabled={busy} />
          </div>

          <Separator />

          <div className="flex items-center justify-between gap-2 p-3">
            <AlertDialog open={reseedOpen} onOpenChange={setReseedOpen}>
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => setReseedOpen(true)}
              >
                <RotateCcw data-icon="inline-start" />
                {m.previewToolbar_reseed()}
              </Button>
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

            <Button
              variant="ghost"
              size="sm"
              disabled={busy || !viewer}
              onClick={onExit}
            >
              {exiting ? <Spinner /> : <LogOut data-icon="inline-start" />}
              {m.previewToolbar_exit()}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

/** Tri-state talent-directory option label, from the message catalog. */
function visibilityLabel(value: TalentDirectoryVisibility): string {
  switch (value) {
    case 'off':
      return m.previewToolbar_talentVisibility_off();
    case 'public':
      return m.previewToolbar_talentVisibility_public();
    case 'employers_only':
      return m.previewToolbar_talentVisibility_employersOnly();
  }
}

/**
 * One "Board settings" row. A boolean flag renders a Switch; the tri-state
 * `talentDirectoryVisibility` renders a small native select. Both are
 * controlled by the current `config` prop, so a failed toggle (handled in
 * `onSetFlag`) reverts to the real value on the next loader read.
 */
function FlagControl({
  flag,
  config,
  disabled,
  pending,
  onSet,
}: {
  flag: PreviewFeatureFlag;
  config: PreviewBoardConfig;
  disabled: boolean;
  pending: boolean;
  onSet: (key: string, next: boolean | TalentDirectoryVisibility) => void;
}) {
  const controlId = `preview-flag-${flag.key}`;
  return (
    <li className="flex items-start justify-between gap-3">
      <div className="flex flex-col">
        <label htmlFor={controlId} className="text-sm font-medium">
          {flag.label}
        </label>
        <span className="text-muted-foreground text-xs">
          {flag.description}
        </span>
      </div>
      {flag.kind === 'boolean' ? (
        <Switch
          id={controlId}
          className="mt-0.5"
          checked={config[flag.key] === true}
          disabled={disabled || pending}
          aria-label={flag.label}
          onCheckedChange={(next) => onSet(flag.key, next)}
        />
      ) : (
        <NativeSelect
          size="sm"
          className="mt-0.5 shrink-0"
          id={controlId}
          value={config[flag.key]}
          disabled={disabled || pending}
          aria-label={flag.label}
          onChange={(event) =>
            onSet(flag.key, event.target.value as TalentDirectoryVisibility)
          }
        >
          {flag.options.map((option) => (
            <NativeSelectOption key={option} value={option}>
              {visibilityLabel(option)}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      )}
    </li>
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
