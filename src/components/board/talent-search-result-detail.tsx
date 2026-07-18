import type {
  TalentDetailCta,
  TalentProfileVM,
} from '@/board/talent-view-model';
import {
  TalentProfileContent,
  TalentProfileIdentity,
} from '@/components/board/talent-profile-content';
import { SearchResultDetailHeader } from '@/components/search-results/search-results';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Message (primary) + View profile (secondary) — the CTA is pre-resolved by
 * `resolveTalentDetailCta`, so this only renders whatever links the viewer's
 * state earned. Nothing renders on the loading placeholder (`interactive`
 * false) or when the viewer earns neither control (e.g. a candidate viewing
 * a handle-less entry).
 */
function TalentDetailActions({
  cta,
  interactive,
}: {
  cta: TalentDetailCta;
  interactive: boolean;
}) {
  if (!interactive || (!cta.message && !cta.viewProfile)) return null;

  return (
    <div
      data-slot="talent-detail-actions"
      className="flex flex-wrap items-center gap-2"
    >
      {cta.message ? (
        <a href={cta.message.href} className={buttonVariants()}>
          {cta.message.label}
        </a>
      ) : null}
      {cta.viewProfile ? (
        <a
          href={cta.viewProfile.href}
          className={buttonVariants({ variant: 'outline' })}
        >
          {cta.viewProfile.label}
        </a>
      ) : null}
    </div>
  );
}

function ExpandedTalentDetailHeader({
  vm,
  cta,
  interactive,
}: {
  vm: TalentProfileVM;
  cta: TalentDetailCta;
  interactive: boolean;
}) {
  const hasActions = interactive && Boolean(cta.message || cta.viewProfile);

  return (
    <header
      data-slot="talent-detail-expanded-header"
      className="grid max-w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-4 p-5 md:p-6"
    >
      <div className="col-start-1 row-start-1 min-w-0">
        <TalentProfileIdentity vm={vm} headingAs="h2" />
      </div>
      {hasActions ? (
        <div className="col-start-1 row-start-2 w-fit justify-self-start">
          <TalentDetailActions cta={cta} interactive />
        </div>
      ) : null}
    </header>
  );
}

function CompactTalentDetailHeader({
  vm,
  cta,
  interactive,
}: {
  vm: TalentProfileVM;
  cta: TalentDetailCta;
  interactive: boolean;
}) {
  return (
    <header
      data-slot="talent-detail-compact-header"
      className="border-border bg-background/95 grid min-h-16 max-w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b px-5 py-3 backdrop-blur md:px-6"
    >
      <div className="min-w-0">
        <p className="truncate text-base font-semibold">{vm.displayName}</p>
        {vm.headline ? (
          <p className="text-muted-foreground truncate text-sm">
            {vm.headline}
          </p>
        ) : null}
      </div>
      <div className="justify-self-end">
        <TalentDetailActions cta={cta} interactive={interactive} />
      </div>
    </header>
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
            <div className="flex items-center gap-3">
              <Skeleton className="size-12 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-7 w-48 max-w-full" />
                <Skeleton className="h-4 w-64 max-w-full" />
              </div>
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-6 w-28" />
            </div>
            <div data-slot="talent-detail-actions-loading">
              <Skeleton className="h-9 w-28" />
            </div>
          </header>
        }
        compact={
          <header className="border-border bg-background/95 grid min-h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b px-5 py-3 backdrop-blur md:px-6">
            <div className="min-w-0 space-y-1">
              <Skeleton className="h-5 w-44 max-w-full" />
              <Skeleton className="h-4 w-56 max-w-full" />
            </div>
            <Skeleton className="h-9 w-28" />
          </header>
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
}: {
  vm: TalentProfileVM;
  cta?: TalentDetailCta;
  interactive?: boolean;
}) {
  return (
    <article className="max-w-full min-w-0">
      <SearchResultDetailHeader
        expanded={
          <ExpandedTalentDetailHeader
            vm={vm}
            cta={cta}
            interactive={interactive}
          />
        }
        compact={
          <CompactTalentDetailHeader
            vm={vm}
            cta={cta}
            interactive={interactive}
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
