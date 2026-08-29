import { useState } from 'react';

import {
  CopyIcon,
  CheckIcon,
  ExternalLinkIcon,
  GripVerticalIcon,
  MoreVerticalIcon,
} from 'lucide-react';
import { Button as AriaButton } from 'react-aria-components/Button';
import { GridList, GridListItem } from 'react-aria-components/GridList';
import {
  DropIndicator,
  isTextDropItem,
  useDragAndDrop,
  type DropItem,
} from 'react-aria-components/useDragAndDrop';

import { m } from '../../paraglide/messages';

import type {
  PipelineBoardVM,
  PipelineCardVM,
  PipelineStageVM,
} from '@/board/pipeline-view-model';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const DRAG_TYPE = 'cavuno/application';
const SOURCED_DRAG_TYPE = 'application/x-cavuno-sourced';

/** The settle result every pipeline mutation resolves to. */
type PipelineActionResult = { ok: boolean; message?: string };

/**
 * The six pipeline mutations, threaded from the route as one typed bag so this
 * presentational board never imports `@/server/*` (Layer 2 stays free of the
 * server surface; the route owns auth and the server-function calls).
 */
export interface PipelineActions {
  moveApplicant: (opts: {
    data: { slug: string; applicationId: string; stageId: string };
  }) => Promise<PipelineActionResult>;
  bulkRejectApplicants: (opts: {
    data: { slug: string; applicationIds: string[] };
  }) => Promise<PipelineActionResult>;
  addApplicantNote: (opts: {
    data: { slug: string; applicationId: string; body: string };
  }) => Promise<PipelineActionResult>;
  createStage: (opts: {
    data: { slug: string; jobId: string; label: string };
  }) => Promise<PipelineActionResult>;
  renameStage: (opts: {
    data: { slug: string; stageId: string; label: string };
  }) => Promise<PipelineActionResult>;
  removeStage: (opts: {
    data: { slug: string; stageId: string };
  }) => Promise<PipelineActionResult>;
  invalidate: () => Promise<void>;
  toastError: (message: string) => void;
  convertSourced?: (opts: {
    data: { slug: string; sourcedId: string; stage: string };
  }) => Promise<PipelineActionResult>;
}

type StageDialogState =
  | { kind: 'add' }
  | { kind: 'rename'; stage: PipelineStageVM }
  | { kind: 'delete'; stage: PipelineStageVM }
  | null;

export interface ApplicantPipelineBoardProps {
  slug: string;
  jobId: string;
  board: PipelineBoardVM;
  /** Pipeline mutations, owned by the route (server-function calls). */
  actions: PipelineActions;
  /** Test/preview hook: open a card's detail sheet on mount. */
  defaultOpenCardId?: string;
  /** Test/preview hook: render a stage dialog open on mount. */
  defaultStageDialog?: StageDialogState;
  sourced?: Array<{
    id: string;
    candidate: { displayName: string | null; headline: string | null };
  }>;
}

/**
 * The employer applicant pipeline as a KANBAN board. Columns are the
 * pipeline's visible stages in order; cards are applicants. Dragging a
 * card (pointer OR keyboard, via react-aria's `useDragAndDrop` + a
 * `GridList` per column) changes its stage through the same `moveApplicant`
 * server function the detail sheet's stage picker uses. Moves are
 * optimistic: the card jumps columns immediately and reverts on error.
 *
 * Every other capability the flat list had stays reachable — the resume
 * link, stage picker, private-note field, activity timeline, and reject
 * action live in a per-card detail sheet; stage add/rename/delete live in
 * the board header and each column's menu (system stages are immutable).
 */
export function ApplicantPipelineBoard({
  slug,
  jobId,
  board,
  actions,
  defaultOpenCardId,
  defaultStageDialog = null,
  sourced = [],
}: ApplicantPipelineBoardProps) {
  const { stages, cards } = board;

  // Optimistic stage overrides: cardId → target stage id. The card renders
  // in the target column immediately; cleared on settle (success keeps the
  // fresh server truth after invalidate, failure reverts to `columnStageId`).
  const [pendingMoves, setPendingMoves] = useState<Record<string, string>>({});
  const [openCardId, setOpenCardId] = useState<string | null>(
    defaultOpenCardId ?? null,
  );
  const [stageDialog, setStageDialog] =
    useState<StageDialogState>(defaultStageDialog);

  function columnIdFor(card: PipelineCardVM) {
    return pendingMoves[card.id] ?? card.columnStageId;
  }

  async function invalidate() {
    await actions.invalidate();
  }

  const openCard = openCardId
    ? (cards.find((card) => card.id === openCardId) ?? null)
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading text-xl font-semibold">
          {m.employerApplicants_stagesHeading()}
        </h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setStageDialog({ kind: 'add' })}
        >
          {m.employerApplicants_addStageLabel()}
        </Button>
      </div>

      <div className="-mx-1 overflow-x-auto overscroll-x-contain px-1 pb-2">
        <div
          className="grid min-h-(--detail-pane-min-h) items-stretch gap-3"
          style={{
            gridTemplateColumns: `minmax(min(16rem, calc(100vw - 3rem)), 1fr) repeat(${Math.max(stages.length, 1)}, minmax(min(18rem, calc(100vw - 3rem)), 1fr))`,
          }}
        >
          <section className="border-border/60 bg-muted/20 flex min-h-[24rem] flex-col rounded-2xl border">
            <div className="flex items-center gap-2 px-3 py-2.5">
              <h3 className="text-foreground truncate text-sm font-medium">
                {m.employerApplicants_sourcedHeading()}
              </h3>
              <span className="text-muted-foreground text-sm tabular-nums">
                {sourced.length}
              </span>
            </div>
            <ul className="flex flex-1 flex-col gap-2 p-2">
              {sourced.map((row) => (
                <li
                  key={row.id}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData(SOURCED_DRAG_TYPE, row.id);
                    event.dataTransfer.effectAllowed = 'move';
                  }}
                  className="bg-background rounded-xl border p-3 text-sm"
                >
                  <p className="font-medium">
                    {row.candidate.displayName ??
                      m.employerApplicants_unknownCandidate()}
                  </p>
                  {row.candidate.headline ? (
                    <p className="text-muted-foreground mt-1 text-xs">
                      {row.candidate.headline}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
          {stages.map((stage) => (
            <StageColumn
              key={stage.id}
              stage={stage}
              cards={cards.filter((card) => columnIdFor(card) === stage.id)}
              onOpenCard={(id) => setOpenCardId(id)}
              onRename={() => setStageDialog({ kind: 'rename', stage })}
              onDelete={() => setStageDialog({ kind: 'delete', stage })}
              onDropCard={(cardId) => {
                void moveCard({
                  cardId,
                  toStageId: stage.id,
                  cards,
                  pendingMoves,
                  setPendingMoves,
                  slug,
                  invalidate,
                  moveApplicant: actions.moveApplicant,
                  toastError: actions.toastError,
                });
              }}
              onDropSourced={(sourcedId) => {
                if (!actions.convertSourced) return;
                void actions
                  .convertSourced({
                    data: {
                      slug,
                      sourcedId,
                      stage: stage.systemStage ?? stage.id,
                    },
                  })
                  .then((result) => {
                    if (!result.ok) {
                      actions.toastError(
                        result.message || m.employerApplicants_moveError(),
                      );
                      return;
                    }
                    return invalidate();
                  });
              }}
            />
          ))}
        </div>
      </div>

      <ApplicantDetailSheet
        slug={slug}
        card={openCard}
        stages={stages}
        currentStageId={openCard ? columnIdFor(openCard) : ''}
        open={openCard !== null}
        onOpenChange={(next) => {
          if (!next) setOpenCardId(null);
        }}
        onMove={(toStageId) => {
          if (!openCard) return;
          void moveCard({
            cardId: openCard.id,
            toStageId,
            cards,
            pendingMoves,
            setPendingMoves,
            slug,
            invalidate,
            moveApplicant: actions.moveApplicant,
            toastError: actions.toastError,
          });
        }}
        actions={actions}
        onInvalidate={invalidate}
        onRejected={() => setOpenCardId(null)}
      />

      <StageDialogs
        key={
          stageDialog
            ? `${stageDialog.kind}:${'stage' in stageDialog ? stageDialog.stage.id : 'new'}`
            : 'closed'
        }
        slug={slug}
        jobId={jobId}
        state={stageDialog}
        actions={actions}
        onClose={() => setStageDialog(null)}
        onInvalidate={invalidate}
      />
    </div>
  );
}

/** Move one card to a stage optimistically, reverting on server error. */
async function moveCard({
  cardId,
  toStageId,
  cards,
  pendingMoves,
  setPendingMoves,
  slug,
  invalidate,
  moveApplicant,
  toastError,
}: {
  cardId: string;
  toStageId: string;
  cards: PipelineCardVM[];
  pendingMoves: Record<string, string>;
  setPendingMoves: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  slug: string;
  invalidate: () => Promise<void>;
  moveApplicant: PipelineActions['moveApplicant'];
  toastError: PipelineActions['toastError'];
}) {
  const card = cards.find((item) => item.id === cardId);
  const currentColumn = pendingMoves[cardId] ?? card?.columnStageId;
  // No-op when already here or a move for this card is already in flight.
  if (!card || currentColumn === toStageId || cardId in pendingMoves) return;

  setPendingMoves((current) => ({ ...current, [cardId]: toStageId }));
  let result: PipelineActionResult;
  try {
    result = await moveApplicant({
      data: { slug, applicationId: cardId, stageId: toStageId },
    });
  } catch {
    toastError(m.employerApplicants_moveError());
    setPendingMoves((current) => {
      const { [cardId]: _dropped, ...rest } = current;
      return rest;
    });
    return;
  }
  if (!result.ok) {
    toastError(result.message || m.employerApplicants_moveError());
    setPendingMoves((current) => {
      const { [cardId]: _dropped, ...rest } = current;
      return rest;
    });
    return;
  }
  try {
    await invalidate();
  } catch {
    // Keep the committed optimistic position until reload instead of falsely
    // reverting it, and identify only the reconciliation as failed.
    toastError(m.employerCompany_reconciliationError());
    return;
  }
  setPendingMoves((current) => {
    const { [cardId]: _dropped, ...rest } = current;
    return rest;
  });
}

function StageColumn({
  stage,
  cards,
  onOpenCard,
  onRename,
  onDelete,
  onDropCard,
  onDropSourced,
}: {
  stage: PipelineStageVM;
  cards: PipelineCardVM[];
  onOpenCard: (id: string) => void;
  onRename: () => void;
  onDelete: () => void;
  onDropCard: (cardId: string) => void;
  onDropSourced?: (sourcedId: string) => void;
}) {
  const { dragAndDropHooks } = useDragAndDrop<PipelineCardVM>({
    acceptedDragTypes: [DRAG_TYPE, SOURCED_DRAG_TYPE],
    getItems: (_keys, items) =>
      items.map((card) => ({
        [DRAG_TYPE]: card.id,
        'text/plain': card.name,
      })),
    getDropOperation: () => 'move',
    onRootDrop: (event) => moveDropped(event.items, onDropCard, onDropSourced),
    onInsert: (event) => moveDropped(event.items, onDropCard, onDropSourced),
    onItemDrop: (event) => moveDropped(event.items, onDropCard, onDropSourced),
    renderDropIndicator: (target) => (
      <DropIndicator
        target={target}
        className="data-[drop-target]:bg-primary invisible h-0.5 rounded-full data-[drop-target]:visible"
      />
    ),
  });

  return (
    <section className="border-border/60 bg-muted/30 flex min-h-[24rem] flex-col rounded-2xl border">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <h3 className="text-foreground truncate text-sm font-medium">
          {stage.label}
        </h3>
        <span className="text-muted-foreground text-sm tabular-nums">
          {cards.length}
        </span>
        {stage.isProtected ? (
          <Badge variant="secondary" className="ms-auto">
            {m.employerApplicants_systemBadge()}
          </Badge>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="ms-auto"
                  aria-label={`${m.employerApplicants_stageOptionsLabel()} · ${stage.label}`}
                />
              }
            >
              <MoreVerticalIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onRename}>
                {m.employerApplicants_renameStageMenuLabel()}
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={onDelete}>
                {m.employerApplicants_deleteStageMenuLabel()}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <GridList
        aria-label={m.employerApplicants_columnLabel({ stage: stage.label })}
        className="data-[drop-target]:ring-primary flex flex-1 flex-col gap-2 px-2.5 pt-1 pb-3 outline-none data-[drop-target]:rounded-2xl data-[drop-target]:ring-2"
        dragAndDropHooks={dragAndDropHooks}
        items={cards}
        renderEmptyState={() => (
          <span className="text-muted-foreground/70 px-1 py-6 text-center text-xs">
            {m.employerApplicants_emptyColumnLabel()}
          </span>
        )}
      >
        {(card) => (
          <GridListItem
            id={card.id}
            textValue={card.name}
            value={card}
            aria-label={m.employerApplicants_openCardLabel({ name: card.name })}
            className="group data-[drop-target]:ring-primary data-[focus-visible]:ring-ring cursor-pointer rounded-2xl outline-none data-[dragging]:opacity-50 data-[drop-target]:ring-2 data-[focus-visible]:ring-2"
            onAction={() => onOpenCard(card.id)}
          >
            <ApplicantCard card={card} />
          </GridListItem>
        )}
      </GridList>
    </section>
  );
}

async function moveDropped(
  items: DropItem[],
  onDropCard: (cardId: string) => void,
  onDropSourced?: (sourcedId: string) => void,
) {
  const textItems = items.filter(isTextDropItem);
  for (const item of textItems) {
    if (item.types.has(SOURCED_DRAG_TYPE)) {
      const sourcedId = await item.getText(SOURCED_DRAG_TYPE);
      if (sourcedId) onDropSourced?.(sourcedId);
      continue;
    }
    const cardId = await item.getText(DRAG_TYPE);
    if (cardId) onDropCard(cardId);
  }
}

function ApplicantCard({ card }: { card: PipelineCardVM }) {
  return (
    <div className="border-border/70 bg-card hover:border-border grid grid-cols-[auto_1fr_auto] items-start gap-2.5 rounded-2xl border px-3 py-3 shadow-xs transition-[border-color,box-shadow]">
      <Avatar className="size-8">
        <AvatarFallback className="text-xs">{card.initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <span className="text-foreground block truncate text-sm font-medium">
          {card.name}
        </span>
        {card.email ? (
          <span className="text-muted-foreground block truncate text-xs">
            {card.email}
          </span>
        ) : null}
        {card.appliedLabel ? (
          <span className="text-muted-foreground mt-2 block text-xs">
            {card.appliedLabel}
          </span>
        ) : null}
      </div>
      <AriaButton
        aria-label={m.employerApplicants_dragHandleLabel({ name: card.name })}
        className="text-muted-foreground data-[focus-visible]:ring-ring sr-only rounded-md outline-none group-data-[focus-visible]:not-sr-only focus:not-sr-only data-[focus-visible]:ring-2"
        slot="drag"
      >
        <GripVerticalIcon className="size-4" />
      </AriaButton>
    </div>
  );
}

function ApplicantDetailSheet({
  slug,
  card,
  stages,
  currentStageId,
  open,
  onOpenChange,
  onMove,
  actions,
  onInvalidate,
  onRejected,
}: {
  slug: string;
  card: PipelineCardVM | null;
  stages: PipelineStageVM[];
  currentStageId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMove: (toStageId: string) => void;
  actions: PipelineActions;
  onInvalidate: () => Promise<void>;
  onRejected: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
        {card ? (
          <ApplicantDetailBody
            key={card.id}
            slug={slug}
            card={card}
            stages={stages}
            currentStageId={currentStageId}
            onMove={onMove}
            actions={actions}
            onInvalidate={onInvalidate}
            onRejected={onRejected}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function ApplicantDetailBody({
  slug,
  card,
  stages,
  currentStageId,
  onMove,
  actions,
  onInvalidate,
  onRejected,
}: {
  slug: string;
  card: PipelineCardVM;
  stages: PipelineStageVM[];
  currentStageId: string;
  onMove: (toStageId: string) => void;
  actions: PipelineActions;
  onInvalidate: () => Promise<void>;
  onRejected: () => void;
}) {
  const [note, setNote] = useState('');
  const [copied, setCopied] = useState(false);
  const [action, setAction] = useState<{
    pending: boolean;
    scope: 'note' | 'reject' | null;
    message: string;
  }>({ pending: false, scope: null, message: '' });

  const stageItems = Object.fromEntries(
    stages.map((stage): [string, string] => [stage.id, stage.label]),
  );

  function copyEmail() {
    if (!card.email) return;
    void navigator.clipboard?.writeText(card.email).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  }

  async function run(
    scope: 'note' | 'reject',
    fn: () => Promise<{ ok: boolean; message?: string }>,
  ) {
    if (action.pending) return false;
    setAction({ pending: true, scope, message: '' });
    let result: { ok: boolean; message?: string };
    try {
      result = await fn();
    } catch {
      setAction({
        pending: false,
        scope,
        message: m.employerApplicants_genericError(),
      });
      return false;
    }
    if (!result.ok) {
      setAction({
        pending: false,
        scope,
        message: result.message ?? m.employerApplicants_genericError(),
      });
      return false;
    }
    setAction({ pending: false, scope: null, message: '' });
    try {
      await onInvalidate();
    } catch {
      actions.toastError(m.employerCompany_reconciliationError());
    }
    return true;
  }

  return (
    <>
      <SheetHeader className="gap-1">
        <SheetTitle className="truncate">{card.name}</SheetTitle>
        {card.email ? (
          <button
            type="button"
            onClick={copyEmail}
            aria-label={m.employerApplicants_copyEmailLabel()}
            className="text-muted-foreground hover:text-foreground inline-flex w-fit max-w-full items-center gap-1.5 text-start text-sm transition-colors"
          >
            <span className="min-w-0 truncate">
              {copied ? m.employerApplicants_emailCopiedLabel() : card.email}
            </span>
            {copied ? (
              <CheckIcon className="size-3.5 shrink-0" />
            ) : (
              <CopyIcon className="size-3.5 shrink-0" />
            )}
          </button>
        ) : null}
      </SheetHeader>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4">
        {card.resumeUrl ? (
          <a
            href={card.resumeUrl}
            target="_blank"
            rel="noreferrer"
            className={cn(
              buttonVariants({ variant: 'outline', size: 'sm' }),
              'w-fit',
            )}
          >
            {m.employerApplicants_resumeLabel()}
            <ExternalLinkIcon data-icon="inline-end" />
          </a>
        ) : null}

        {card.coverNote ? (
          <section className="space-y-1.5">
            <h3 className="text-foreground text-sm font-medium">
              {m.employerApplicants_coverNoteHeading()}
            </h3>
            <p className="text-muted-foreground text-sm whitespace-pre-wrap">
              {card.coverNote}
            </p>
          </section>
        ) : null}

        <Field>
          <FieldLabel htmlFor={`stage-${card.id}`}>
            {m.employerApplicants_stageLabel()}
          </FieldLabel>
          <Select
            items={stageItems}
            value={currentStageId}
            disabled={action.pending}
            onValueChange={(value) => {
              if (value && value !== currentStageId) onMove(value);
            }}
          >
            <SelectTrigger
              id={`stage-${card.id}`}
              aria-label={m.employerApplicants_stageLabel()}
              className="w-full"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {stages.map((stage) => (
                <SelectItem key={stage.id} value={stage.id}>
                  {stage.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (!note.trim()) return;
            const ok = await run('note', () =>
              actions.addApplicantNote({
                data: { slug, applicationId: card.id, body: note.trim() },
              }),
            );
            if (ok) setNote('');
          }}
        >
          <Field
            data-invalid={action.scope === 'note' && Boolean(action.message)}
          >
            <FieldLabel htmlFor={`note-${card.id}`}>
              {m.employerApplicants_notePlaceholder()}
            </FieldLabel>
            <Textarea
              id={`note-${card.id}`}
              value={note}
              aria-label={m.employerApplicants_notePlaceholder()}
              placeholder={m.employerApplicants_notePlaceholder()}
              className="min-h-24 resize-none"
              onChange={(event) => setNote(event.target.value)}
            />
            {action.scope === 'note' && action.message ? (
              <FieldError>{action.message}</FieldError>
            ) : null}
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="w-fit"
              disabled={action.pending || !note.trim()}
            >
              {m.employerApplicants_saveNoteLabel()}
            </Button>
          </Field>
        </form>

        {card.timeline.length > 0 ? (
          <section className="space-y-2">
            <h3 className="text-foreground text-sm font-medium">
              {m.employerApplicants_activityHeading()}
            </h3>
            <ol className="space-y-2">
              {card.timeline.map((entry) => (
                <li key={entry.id} className="text-muted-foreground text-sm">
                  {entry.text}
                </li>
              ))}
            </ol>
          </section>
        ) : null}
      </div>

      <div className="border-border flex items-center gap-2 border-t p-4">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={action.pending}
          onClick={async () => {
            const ok = await run('reject', () =>
              actions.bulkRejectApplicants({
                data: { slug, applicationIds: [card.id] },
              }),
            );
            if (ok) onRejected();
          }}
        >
          {m.employerApplicants_rejectLabel()}
        </Button>
        {action.scope === 'reject' && action.message ? (
          <div data-applicant-action-feedback className="flex-1">
            <Alert variant="destructive">
              <AlertDescription>{action.message}</AlertDescription>
            </Alert>
          </div>
        ) : null}
      </div>
    </>
  );
}

function StageDialogs({
  slug,
  jobId,
  state,
  actions,
  onClose,
  onInvalidate,
}: {
  slug: string;
  jobId: string;
  state: StageDialogState;
  actions: PipelineActions;
  onClose: () => void;
  onInvalidate: () => Promise<void>;
}) {
  const [label, setLabel] = useState(
    state && state.kind === 'rename' ? state.stage.label : '',
  );
  const [status, setStatus] = useState<{ pending: boolean; message: string }>({
    pending: false,
    message: '',
  });

  async function submit(fn: () => Promise<{ ok: boolean; message?: string }>) {
    if (status.pending) return;
    setStatus({ pending: true, message: '' });
    let result: { ok: boolean; message?: string };
    try {
      result = await fn();
    } catch {
      setStatus({
        pending: false,
        message: m.employerApplicants_genericError(),
      });
      return;
    }
    if (!result.ok) {
      setStatus({
        pending: false,
        message: result.message ?? m.employerApplicants_genericError(),
      });
      return;
    }
    onClose();
    try {
      await onInvalidate();
    } catch {
      actions.toastError(m.employerCompany_reconciliationError());
    }
  }

  const isForm = state?.kind === 'add' || state?.kind === 'rename';

  return (
    <>
      <Dialog
        open={isForm}
        onOpenChange={(next) => {
          if (!next) onClose();
        }}
      >
        <DialogContent>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!label.trim()) return;
              if (state?.kind === 'add') {
                void submit(() =>
                  actions.createStage({
                    data: { slug, jobId, label: label.trim() },
                  }),
                );
              } else if (state?.kind === 'rename') {
                void submit(() =>
                  actions.renameStage({
                    data: {
                      slug,
                      stageId: state.stage.id,
                      label: label.trim(),
                    },
                  }),
                );
              }
            }}
            className="space-y-4"
          >
            <DialogHeader>
              <DialogTitle>
                {state?.kind === 'rename'
                  ? m.employerApplicants_renameStageTitle()
                  : m.employerApplicants_addStageTitle()}
              </DialogTitle>
            </DialogHeader>
            <Field data-invalid={Boolean(status.message)}>
              <FieldLabel htmlFor="stage-name">
                {m.employerApplicants_stageNameLabel()}
              </FieldLabel>
              <Input
                id="stage-name"
                value={label}
                aria-label={m.employerApplicants_stageNameLabel()}
                autoFocus
                onChange={(event) => setLabel(event.target.value)}
              />
              {status.message ? (
                <FieldError>{status.message}</FieldError>
              ) : null}
            </Field>
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>
                {m.employerApplicants_cancelLabel()}
              </DialogClose>
              <Button type="submit" disabled={status.pending || !label.trim()}>
                {m.employerApplicants_saveLabel()}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={state?.kind === 'delete'}
        onOpenChange={(next) => {
          if (!next) onClose();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {state?.kind === 'delete'
                ? m.employerApplicants_deleteStageTitle({
                    stage: state.stage.label,
                  })
                : ''}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {m.employerApplicants_deleteStageBody()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {status.message ? (
            <Alert variant="destructive">
              <AlertDescription>{status.message}</AlertDescription>
            </Alert>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>
              {m.employerApplicants_cancelLabel()}
            </AlertDialogCancel>
            <AlertDialogAction
              type="button"
              variant="destructive"
              disabled={status.pending}
              onClick={(event) => {
                event.preventDefault();
                if (state?.kind === 'delete') {
                  void submit(() =>
                    actions.removeStage({
                      data: { slug, stageId: state.stage.id },
                    }),
                  );
                }
              }}
            >
              {m.employerApplicants_deleteStageMenuLabel()}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
