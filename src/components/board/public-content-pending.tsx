import { Page, PageContent } from "@/components/layout/page";
import { Skeleton } from "@/components/ui/skeleton";

export function PublicContentPending({ label }: { label: string }) {
  return (
    <Page>
      <PageContent>
        <div role="status" aria-label={label} aria-busy="true" className="flex flex-col gap-6">
          <div className="space-y-3">
            <Skeleton className="h-8 w-2/3 max-w-xl" />
            <Skeleton className="h-4 w-full max-w-2xl" />
            <Skeleton className="h-4 w-4/5 max-w-xl" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-32 rounded-3xl" />
            <Skeleton className="h-32 rounded-3xl" />
          </div>
        </div>
      </PageContent>
    </Page>
  );
}
