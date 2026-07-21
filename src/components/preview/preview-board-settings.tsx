'use client';

import { useState } from 'react';

import { useRouter } from '@tanstack/react-router';
import { TriangleAlert } from 'lucide-react';

import {
  PREVIEW_FEATURE_FLAGS,
  type PreviewBoardConfig,
  type PreviewFeatureFlag,
  type TalentDirectoryVisibility,
} from '../../lib/preview';
import { updateSandboxFlags } from '../../server/preview';

import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { m } from '../../paraglide/messages';

/**
 * The "Board settings" surface — the sandbox analog of the dashboard's board
 * settings (spec §4b item 5), split out of the persona menu into its own
 * focused sheet (progressive disclosure: the persona popover does ONE job, the
 * flag controls live behind their own affordance). Reached from the toolbar
 * footer's gear and controlled by the parent; closing it returns to nothing
 * — it never re-opens the persona menu.
 *
 * The optimistic-update + error-banner behavior moved here verbatim from the
 * old inline section: each control adopts the picked value immediately
 * (`optimisticConfig`) instead of disable→revert→snap while the PATCH + loader
 * refetch round-trips, and a rejected PATCH surfaces the banner and does NOT
 * invalidate, so the control reverts to the real `config` prop.
 */
export function PreviewBoardSettingsSheet({
  config,
  open,
  onOpenChange,
}: {
  config: PreviewBoardConfig;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [pendingFlag, setPendingFlag] = useState<string | null>(null);
  const [flagError, setFlagError] = useState(false);
  // Optimistic overlay for the board-setting controls: the control adopts the
  // picked value immediately instead of disable→revert→snap while the PATCH +
  // loader refetch round-trips. Cleared on settle (success keeps the server
  // truth, failure reverts to the `config` prop).
  const [optimisticConfig, setOptimisticConfig] = useState<
    Partial<PreviewBoardConfig>
  >({});
  const effectiveConfig = { ...config, ...optimisticConfig };

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
    setOptimisticConfig((current) => ({ ...current, [key]: next }));
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
      // Settle: server truth (fresh `config` after invalidate) or revert.
      setOptimisticConfig((current) => {
        const rest = { ...current };
        delete rest[key as keyof PreviewBoardConfig];
        return rest;
      });
      setPendingFlag(null);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 p-0 sm:max-w-md"
        data-test="preview-board-settings-panel"
      >
        <SheetHeader className="p-4">
          <SheetTitle>{m.previewToolbar_boardSettings()}</SheetTitle>
          <SheetDescription>
            {m.previewToolbar_boardSettingsSubtitle()}
          </SheetDescription>
        </SheetHeader>

        <Separator />

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {flagError ? (
            <div
              className="text-destructive bg-destructive/10 mb-4 flex items-start gap-2 rounded-2xl p-3 text-xs"
              role="alert"
            >
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <span>{m.previewToolbar_flagError()}</span>
            </div>
          ) : null}
          <ul className="flex flex-col gap-4">
            {PREVIEW_FEATURE_FLAGS.map((flag) => (
              <FlagControl
                key={flag.key}
                flag={flag}
                config={effectiveConfig}
                pending={pendingFlag === flag.key}
                onSet={onSetFlag}
              />
            ))}
          </ul>
        </div>
      </SheetContent>
    </Sheet>
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
  pending,
  onSet,
}: {
  flag: PreviewFeatureFlag;
  config: PreviewBoardConfig;
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
          disabled={pending}
          aria-label={flag.label}
          onCheckedChange={(next) => onSet(flag.key, next)}
        />
      ) : (
        <NativeSelect
          size="sm"
          className="mt-0.5 shrink-0"
          id={controlId}
          value={config[flag.key]}
          disabled={pending}
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
