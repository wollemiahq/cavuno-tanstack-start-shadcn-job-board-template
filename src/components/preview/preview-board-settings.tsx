'use client';

import { useRef, useState } from 'react';

import { useRouter } from '@tanstack/react-router';
import { TriangleAlert } from 'lucide-react';

import {
  PREVIEW_FEATURE_FLAGS,
  type PreviewBoardConfig,
  type PreviewFeatureFlag,
  type TalentAccessModel,
  type TalentDirectoryVisibility,
  unmetFlagRequirements,
} from '../../lib/preview';
import { m } from '../../paraglide/messages';
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

/**
 * TODO(i18n) resolved: flag copy lives here, keyed by flag key, so the
 * data table in preview.ts stays words-free. Unknown flags fall back to
 * the table's English authoring strings.
 */
const FLAG_COPY = new Map<
  string,
  { label: () => string; description: () => string }
>([
  [
    'jobAccessPaywallEnabled',
    {
      label: m.previewFlag_jobAccessPaywallEnabled_label,
      description: m.previewFlag_jobAccessPaywallEnabled_description,
    },
  ],
  [
    'talentDirectoryVisibility',
    {
      label: m.previewFlag_talentDirectoryVisibility_label,
      description: m.previewFlag_talentDirectoryVisibility_description,
    },
  ],
  [
    'blogEnabled',
    {
      label: m.previewFlag_blogEnabled_label,
      description: m.previewFlag_blogEnabled_description,
    },
  ],
  [
    'jobAlertsEnabled',
    {
      label: m.previewFlag_jobAlertsEnabled_label,
      description: m.previewFlag_jobAlertsEnabled_description,
    },
  ],
  [
    'jobRecommendationsEnabled',
    {
      label: m.previewFlag_jobRecommendationsEnabled_label,
      description: m.previewFlag_jobRecommendationsEnabled_description,
    },
  ],
  [
    'candidatesEnabled',
    {
      label: m.previewFlag_candidatesEnabled_label,
      description: m.previewFlag_candidatesEnabled_description,
    },
  ],
  [
    'employersEnabled',
    {
      label: m.previewFlag_employersEnabled_label,
      description: m.previewFlag_employersEnabled_description,
    },
  ],
  [
    'nativeApplicationsEnabled',
    {
      label: m.previewFlag_nativeApplicationsEnabled_label,
      description: m.previewFlag_nativeApplicationsEnabled_description,
    },
  ],
  [
    'applicantMessagingEnabled',
    {
      label: m.previewFlag_applicantMessagingEnabled_label,
      description: m.previewFlag_applicantMessagingEnabled_description,
    },
  ],
  [
    'registrationWallEnabled',
    {
      label: m.previewFlag_registrationWallEnabled_label,
      description: m.previewFlag_registrationWallEnabled_description,
    },
  ],
]);

function flagLabel(flag: { key: string; label: string }): string {
  return FLAG_COPY.get(flag.key)?.label() ?? flag.label;
}

function flagDescription(flag: { key: string; description: string }): string {
  return FLAG_COPY.get(flag.key)?.description() ?? flag.description;
}

/**
 * The "Board settings" surface — the sandbox analog of the dashboard's board
 * settings, split out of the persona menu into its own
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
export function PreviewBoardSettingsSheetView({
  config,
  open,
  onOpenChange,
  updateFlags,
  invalidate,
}: {
  config: PreviewBoardConfig;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  updateFlags: (
    input: Parameters<typeof updateSandboxFlags>[0],
  ) => ReturnType<typeof updateSandboxFlags>;
  invalidate: () => Promise<void>;
}) {
  const [pendingFlags, setPendingFlags] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [flagError, setFlagError] = useState(false);
  const [flagSyncError, setFlagSyncError] = useState(false);
  const requestRevision = useRef(0);
  const latestRequestByFlag = useRef(new Map<string, number>());
  const pendingRequestCount = useRef(0);
  const needsReconciliation = useRef(false);
  const resetWhenSettled = useRef(false);
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
   * previous effective value. Wrapped so a 4xx never unhandled-rejects.
   */
  async function onSetFlag(
    key: keyof PreviewBoardConfig,
    next: boolean | TalentDirectoryVisibility | TalentAccessModel,
  ) {
    const previous = effectiveConfig[key];
    const revision = ++requestRevision.current;
    latestRequestByFlag.current.set(key, revision);
    pendingRequestCount.current += 1;
    setFlagError(false);
    setFlagSyncError(false);
    setPendingFlags((current) => new Set(current).add(key));
    setOptimisticConfig((current) => ({ ...current, [key]: next }));
    try {
      const result = await updateFlags({
        data: { config: { [key]: next } },
      });
      if (result.ok) {
        // Do one authoritative refresh only after every overlapping write has
        // committed. This avoids reverse-order invalidations restoring an
        // older snapshot over a newer selection.
        needsReconciliation.current = true;
      } else {
        setFlagError(true);
        if (latestRequestByFlag.current.get(key) === revision) {
          setOptimisticConfig((current) => ({
            ...current,
            [key]: previous,
          }));
        }
      }
    } catch {
      setFlagError(true);
      if (latestRequestByFlag.current.get(key) === revision) {
        setOptimisticConfig((current) => ({
          ...current,
          [key]: previous,
        }));
      }
    } finally {
      pendingRequestCount.current -= 1;
      if (latestRequestByFlag.current.get(key) === revision) {
        setPendingFlags((current) => {
          const nextPending = new Set(current);
          nextPending.delete(key);
          return nextPending;
        });
      }

      if (pendingRequestCount.current === 0 && needsReconciliation.current) {
        const refreshRevision = requestRevision.current;
        needsReconciliation.current = false;
        try {
          await invalidate();
          // Keep committed selections overlaid until the sheet closes. Route
          // props may apply out of order after overlapping invalidations; an
          // older snapshot must never restore stale visible truth.
        } catch {
          if (requestRevision.current === refreshRevision) {
            // The PATCH committed. Keep the optimistic committed values and
            // report reconciliation separately instead of claiming the write
            // failed (B-01).
            setFlagSyncError(true);
          }
        }
      }
      if (pendingRequestCount.current === 0 && resetWhenSettled.current) {
        resetWhenSettled.current = false;
        setOptimisticConfig({});
        setFlagError(false);
        setFlagSyncError(false);
      }
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        resetWhenSettled.current = !nextOpen;
        if (!nextOpen) {
          if (pendingRequestCount.current === 0) {
            resetWhenSettled.current = false;
            setOptimisticConfig({});
            setFlagError(false);
            setFlagSyncError(false);
          }
        } else {
          resetWhenSettled.current = false;
        }
        onOpenChange(nextOpen);
      }}
    >
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
          {flagSyncError ? (
            <div
              className="text-destructive bg-destructive/10 mb-4 flex items-start gap-2 rounded-2xl p-3 text-xs"
              role="alert"
            >
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <span>{m.previewToolbar_flagRefreshError()}</span>
            </div>
          ) : null}
          <ul className="flex flex-col gap-4">
            {PREVIEW_FEATURE_FLAGS.map((flag) => (
              <FlagControl
                key={flag.key}
                flag={flag}
                config={effectiveConfig}
                pending={pendingFlags.has(flag.key)}
                onSet={onSetFlag}
              />
            ))}
          </ul>
        </div>
      </SheetContent>
    </Sheet>
  );
}

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
  return (
    <PreviewBoardSettingsSheetView
      config={config}
      open={open}
      onOpenChange={onOpenChange}
      updateFlags={updateSandboxFlags}
      invalidate={() => router.invalidate()}
    />
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

/** Talent-access charging-model option label, from the message catalog. */
function accessModelLabel(value: TalentAccessModel): string {
  switch (value) {
    case 'paid_messaging':
      return m.previewToolbar_talentAccessModel_paidMessaging();
    case 'paid_unlocks_and_messaging':
      return m.previewToolbar_talentAccessModel_paidUnlocksAndMessaging();
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
  onSet: (
    key: keyof PreviewBoardConfig,
    next: boolean | TalentDirectoryVisibility | TalentAccessModel,
  ) => void;
}) {
  const controlId = `preview-flag-${flag.key}`;
  // Dependency gating (mirrors the dashboard): a capability whose parent
  // audience flag is off disables rather than flips — the stored value is
  // never mutated from here.
  const unmet = unmetFlagRequirements(flag, config);
  const gated = unmet.length > 0;
  return (
    <li className="flex items-start justify-between gap-3">
      <div className="flex flex-col">
        <label htmlFor={controlId} className="text-sm font-medium">
          {flagLabel(flag)}
        </label>
        <span className="text-muted-foreground text-xs">
          {flagDescription(flag)}
        </span>
        {gated && flag.kind === 'boolean' && flag.requiresNote ? (
          <span
            className="text-muted-foreground text-xs italic"
            data-test="preview-flag-requires"
          >
            {flag.requiresNote}
          </span>
        ) : null}
      </div>
      {flag.kind === 'boolean' ? (
        <Switch
          id={controlId}
          className="mt-0.5"
          checked={config[flag.key] === true}
          disabled={pending || gated}
          // Visible <label htmlFor> already names the control — avoid a
          // duplicate accessible name from aria-label.
          onCheckedChange={(next) => onSet(flag.key, next)}
        />
      ) : (
        <NativeSelect
          size="sm"
          className="mt-0.5 shrink-0"
          id={controlId}
          value={config[flag.key]}
          disabled={pending}
          // Visible <label htmlFor> already names the control.
          onChange={(event) =>
            // SAFETY: NativeSelect renders exactly flag.options, so the change
            // value is always a member of this flag's own enum.
            onSet(
              flag.key,
              event.target.value as
                | TalentDirectoryVisibility
                | TalentAccessModel,
            )
          }
        >
          {flag.key === 'talentAccessModel'
            ? flag.options.map((option) => (
                <NativeSelectOption key={option} value={option}>
                  {accessModelLabel(option)}
                </NativeSelectOption>
              ))
            : flag.options.map((option) => (
                <NativeSelectOption key={option} value={option}>
                  {visibilityLabel(option)}
                </NativeSelectOption>
              ))}
        </NativeSelect>
      )}
    </li>
  );
}
