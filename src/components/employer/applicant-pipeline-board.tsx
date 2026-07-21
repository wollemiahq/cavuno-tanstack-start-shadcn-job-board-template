import { useRef, useState } from 'react';

import { useRouter } from '@tanstack/react-router';
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
import { m } from '../../paraglide/messages';
import {
  addApplicantNote,
  bulkRejectApplicants,
  createStage,
  moveApplicant,
  removeStage,
  renameStage,
} from '@/server/employers';

const DRAG_TYPE = 'cavuno/application';

type StageDialogState =
  | { kind: 'add' }
  | { kind: 'rename'; stage: PipelineStageVM }
  | { kind: 'delete'; stage: PipelineStageVM }
  | null;

export interface ApplicantPipelineBoardProps {
  slug: string;
  jobId: string;
  board: PipelineBoardVM;
  /** Test/preview hook: open a card's detail sheet on mount. */
  defaultOpenCardId?: string;
  /** Test/preview hook: render a stage dialog open on mount. */
  defaultStageDialog?: StageDialogState;
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
  defaultOpenCardId,
  defaultStageDialog = null,
}: ApplicantPipelineBoardProps) {
  const router = useRouter();
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
    await router.invalidate();
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
          className="grid min-h-[28rem] items-stretch gap-3"
          style={{
            gridTemplateColumns: `repeat(${Math.max(stages.length, 1)}, minmax(min(18rem, calc(100vw - 3rem)), 1fr))`,
          }}
        >
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
          });
        }}
        onInvalidate={invalidate}
        onRejected={() => setOpenCardId(null)}
      />

      <StageDialogs
        slug={slug}
        jobId={jobId}
        state={stageDialog}
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
}: {
  cardId: string;
  toStageId: string;
  cards: PipelineCardVM[];
  pendingMoves: Record<string, string>;
  setPendingMoves: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  slug: string;
  invalidate: () => Promise<void>;
}) {
  const card = cards.find((item) => item.id === cardId);
  const currentColumn = pendingMoves[cardId] ?? card?.columnStageId;
  // No-op when already here or a move for this card is already in flight.
  if (!card || currentColumn === toStageId || cardId in pendingMoves) return;

  setPendingMoves((current) => ({ ...current, [cardId]: toStageId }));
  try {
    const result = await moveApplicant({
      data: { slug, applicationId: cardId, stageId: toStageId },
    });
    if (result.ok) {
      await invalidate();
    } else {
      const { toast } = await import('sonner');
      toast.error(result.message || m.employerApplicants_moveError());
    }
  } catch {
    const { toast } = await import('sonner');
    toast.error(m.employerApplicants_moveError());
  } finally {
    setPendingMoves((current) => {
      const { [cardId]: _dropped, ...rest } = current;
      return rest;
    });
  }
}

function StageColumn({
  stage,
  cards,
  onOpenCard,
  onRename,
  onDelete,
  onDropCard,
}: {
  stage: PipelineStageVM;
  cards: PipelineCardVM[];
  onOpenCard: (id: string) => void;
  onRename: () => void;
  onDelete: () => void;
  onDropCard: (cardId: string) => void;
}) {
  const { dragAndDropHooks } = useDragAndDrop<PipelineCardVM>({
    acceptedDragTypes: [DRAG_TYPE],
    getItems: (_keys, items) =>
      items.map((card) => ({
        [DRAG_TYPE]: card.id,
        'text/plain': card.name,
      })),
    getDropOperation: () => 'move',
    onRootDrop: (event) => moveDropped(event.items, onDropCard),
    onInsert: (event) => moveDropped(event.items, onDropCard),
    onItemDrop: (event) => moveDropped(event.items, onDropCard),
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
          <Badge variant="secondary" className="ml-auto">
            {m.employerApplicants_systemBadge()}
          </Badge>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="ml-auto"
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
) {
  const ids = await Promise.all(
    items.filter(isTextDropItem).map((item) => item.getText(DRAG_TYPE)),
  );
  ids.filter(Boolean).forEach((id) => onDropCard(id));
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
  onInvalidate,
  onRejected,
}: {
  slug: string;
  card: PipelineCardVM;
  stages: PipelineStageVM[];
  currentStageId: string;
  onMove: (toStageId: string) => void;
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
    try {
      const result = await fn();
      if (!result.ok) {
        setAction({
          pending: false,
          scope,
          message: result.message ?? m.employerApplicants_genericError(),
        });
        return false;
      }
      await onInvalidate();
      setAction({ pending: false, scope: null, message: '' });
      return true;
    } catch {
      setAction({
        pending: false,
        scope,
        message: m.employerApplicants_genericError(),
      });
      return false;
    }
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
            className="text-muted-foreground hover:text-foreground inline-flex w-fit max-w-full items-center gap-1.5 text-left text-sm transition-colors"
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
              addApplicantNote({
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
              bulkRejectApplicants({
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
  onClose,
  onInvalidate,
}: {
  slug: string;
  jobId: string;
  state: StageDialogState;
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

  // Re-seed local state whenever the dialog target changes.
  const key = state
    ? `${state.kind}:${'stage' in state ? state.stage.id : 'new'}`
    : 'closed';
  const seedRef = useRef(key);
  if (seedRef.current !== key) {
    seedRef.current = key;
    setLabel(state && state.kind === 'rename' ? state.stage.label : '');
    setStatus({ pending: false, message: '' });
  }

  async function submit(fn: () => Promise<{ ok: boolean; message?: string }>) {
    if (status.pending) return;
    setStatus({ pending: true, message: '' });
    try {
      const result = await fn();
      if (!result.ok) {
        setStatus({
          pending: false,
          message: result.message ?? m.employerApplicants_genericError(),
        });
        return;
      }
      await onInvalidate();
      onClose();
    } catch {
      setStatus({
        pending: false,
        message: m.employerApplicants_genericError(),
      });
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
                  createStage({ data: { slug, jobId, label: label.trim() } }),
                );
              } else if (state?.kind === 'rename') {
                void submit(() =>
                  renameStage({
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
                    removeStage({ data: { slug, stageId: state.stage.id } }),
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
