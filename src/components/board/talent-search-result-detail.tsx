import type { TalentProfileVM } from '@/board/talent-view-model';
import { TalentProfileContent } from '@/components/board/talent-profile-content';
import { buttonVariants } from '@/components/ui/button';

export function TalentSearchResultDetail({
  vm,
  interactive = true,
}: {
  vm: TalentProfileVM;
  interactive?: boolean;
}) {
  return (
    <article>
      {interactive && vm.detailHref ? (
        <div
          data-slot="talent-detail-actions"
          className="border-border bg-background/95 sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b p-4 backdrop-blur"
        >
          <a href={vm.detailHref} className={buttonVariants()}>
            {vm.viewProfileLabel}
          </a>
        </div>
      ) : null}

      <div className="p-5 md:p-6">
        <TalentProfileContent
          vm={vm}
          headingAs="h2"
          interactive={interactive}
        />
      </div>
    </article>
  );
}
