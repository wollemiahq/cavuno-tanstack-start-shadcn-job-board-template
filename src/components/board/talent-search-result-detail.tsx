import type { ReactNode } from 'react';

import type {
  TalentDetailCta,
  TalentProfileVM,
} from '@/board/talent-view-model';
import { SearchDetailHeader } from '@/components/board/search-detail-header';
import {
  TalentMessageAction,
  type StartTalentConversation,
} from '@/components/board/talent-message-action';
import {
  TalentProfileContent,
  TalentProfileIdentity,
} from '@/components/board/talent-profile-content';
import { SearchResultDetailHeader } from '@/components/search-results/search-results';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { initialsOf } from '@/lib/initials';
import { localizePath } from '@/lib/localized-path';

/** The talent mark — the shared Avatar primitive with an initials fallback. */
function TalentMark({ vm }: { vm: TalentProfileVM }) {
  return (
    <Avatar size="lg">
      {vm.avatarUrl ? (
        <AvatarImage src={vm.avatarUrl} alt={vm.avatarName} />
      ) : null}
      <AvatarFallback>{initialsOf(vm.avatarName)}</AvatarFallback>
    </Avatar>
  );
}

/**
 * The Message action — the CTA is pre-resolved by `resolveTalentDetailCta`, so
 * this only renders when the viewer's state earns a Message link. The route to
 * the canonical profile is no longer a button here: the candidate's NAME links
 * there (see `nameHref` on the identity / compact header). Nothing renders on
 * the loading placeholder (`interactive` false) or when the viewer earns no
 * Message (e.g. a candidate viewing another candidate).
 */
function TalentDetailActions({
  cta,
  interactive,
  candidateName,
  saveSlot,
  onStartConversation,
  onConversationStarted,
}: {
  cta: TalentDetailCta;
  interactive: boolean;
  candidateName: string;
  saveSlot?: ReactNode;
  onStartConversation?: StartTalentConversation;
  onConversationStarted?: (conversationId: string) => void;
}) {
  if (!interactive || (!cta.message && !saveSlot)) return null;

  return (
    <div
      data-slot="talent-detail-actions"
      className="flex flex-wrap items-center gap-2"
    >
      {cta.message ? (
        <TalentMessageAction
          action={cta.message}
          candidateName={candidateName}
          onStartConversation={onStartConversation}
          onConversationStarted={onConversationStarted}
        />
      ) : null}
      {saveSlot ? (
        <div data-slot="talent-detail-save-action" className="shrink-0">
          {saveSlot}
        </div>
      ) : null}
    </div>
  );
}

function ExpandedTalentDetailHeader({
  vm,
  cta,
  interactive,
  saveSlot,
  onStartConversation,
  onConversationStarted,
}: {
  vm: TalentProfileVM;
  cta: TalentDetailCta;
  interactive: boolean;
  saveSlot?: ReactNode;
  onStartConversation?: StartTalentConversation;
  onConversationStarted?: (conversationId: string) => void;
}) {
  const hasActions = interactive && Boolean(cta.message || saveSlot);

  return (
    <header
      data-slot="talent-detail-expanded-header"
      className="grid max-w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-4 p-5 md:p-6"
    >
      <div className="col-start-1 row-start-1 min-w-0">
        <TalentProfileIdentity
          vm={vm}
          headingAs="h2"
          size="lg"
          nameHref={
            interactive && vm.detailHref ? localizePath(vm.detailHref) : null
          }
        />
      </div>
      {hasActions ? (
        <div className="col-start-1 row-start-2 w-fit justify-self-start">
          <TalentDetailActions
            cta={cta}
            interactive
            candidateName={vm.displayName}
            saveSlot={saveSlot}
            onStartConversation={onStartConversation}
            onConversationStarted={onConversationStarted}
          />
        </div>
      ) : null}
    </header>
  );
}

function CompactTalentDetailHeader({
  vm,
  cta,
  interactive,
  saveSlot,
  onStartConversation,
  onConversationStarted,
}: {
  vm: TalentProfileVM;
  cta: TalentDetailCta;
  interactive: boolean;
  saveSlot?: ReactNode;
  onStartConversation?: StartTalentConversation;
  onConversationStarted?: (conversationId: string) => void;
}) {
  return (
    <SearchDetailHeader
      mark={<TalentMark vm={vm} />}
      name={vm.displayName}
      nameHref={
        interactive && vm.detailHref ? localizePath(vm.detailHref) : null
      }
      subtitle={vm.headline}
      actions={
        <TalentDetailActions
          cta={cta}
          interactive={interactive}
          candidateName={vm.displayName}
          saveSlot={saveSlot}
          onStartConversation={onStartConversation}
          onConversationStarted={onConversationStarted}
        />
      }
    />
  );
}

export function TalentSearchResultDetailSkeleton() {
  return (
    <article aria-hidden="true" className="max-w-full min-w-0">
      <SearchResultDetailHeader
        expanded={
          <header
            data-slot="talent-detail-header-loading"
            className="space-y-4 p-5 md:p-6"
          >
            <div className="flex items-start gap-4">
              <Skeleton className="size-10 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-7 w-48 max-w-full" />
                <Skeleton className="h-4 w-64 max-w-full" />
              </div>
            </div>
            <div className="flex gap-1.5">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-5 w-28" />
            </div>
            <div data-slot="talent-detail-actions-loading">
              <Skeleton className="h-8 w-28" />
            </div>
          </header>
        }
        compact={
          <SearchDetailHeader
            mark={<Skeleton className="size-10 rounded-full" />}
            name={<Skeleton className="h-5 w-44 max-w-full" />}
            subtitle={<Skeleton className="h-4 w-56 max-w-full" />}
            actions={<Skeleton className="h-8 w-28" />}
          />
        }
      />
      <div
        data-slot="talent-detail-loading-body"
        className="max-w-full min-w-0 space-y-8 p-5 md:p-6"
      >
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      </div>
    </article>
  );
}

export function TalentSearchResultDetail({
  vm,
  cta = { message: null, viewProfile: null },
  interactive = true,
  saveSlot,
  onStartConversation,
  onConversationStarted,
}: {
  vm: TalentProfileVM;
  cta?: TalentDetailCta;
  interactive?: boolean;
  saveSlot?: ReactNode;
  onStartConversation?: StartTalentConversation;
  onConversationStarted?: (conversationId: string) => void;
}) {
  return (
    <article className="max-w-full min-w-0">
      <SearchResultDetailHeader
        expanded={
          <ExpandedTalentDetailHeader
            vm={vm}
            cta={cta}
            interactive={interactive}
            saveSlot={saveSlot}
            onStartConversation={onStartConversation}
            onConversationStarted={onConversationStarted}
          />
        }
        compact={
          <CompactTalentDetailHeader
            vm={vm}
            cta={cta}
            interactive={interactive}
            saveSlot={saveSlot}
            onStartConversation={onStartConversation}
            onConversationStarted={onConversationStarted}
          />
        }
      />

      <div className="p-5 md:p-6">
        <TalentProfileContent
          vm={vm}
          headingAs="h2"
          interactive={interactive}
          showHeader={false}
        />
      </div>
    </article>
  );
}
