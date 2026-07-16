import { Bleed } from '@/components/layout/bleed';
import { Page, PageContent } from '@/components/layout/page';

type PageBodyRailProps =
  | { rail?: never; railLabel?: never }
  | { rail: React.ReactNode; railLabel: string };

type PageBodyProps = PageBodyRailProps & {
  /** Full-bleed section rendered above the constrained content. */
  band?: React.ReactNode;
  children: React.ReactNode;
};

/**
 * Migration-only compatibility shell for detail surfaces that need a
 * full-bleed band and an optional sticky rail. Geometry is delegated to the
 * canonical Page family; global navigation context is owned by the root shell
 * breadcrumb.
 */
export function PageBody({ band, rail, railLabel, children }: PageBodyProps) {
  const header = band ? <Bleed>{band}</Bleed> : undefined;

  return (
    <Page width="wide">
      {rail ? (
        <PageContent header={header} aside={rail} asideLabel={railLabel}>
          {children}
        </PageContent>
      ) : (
        <PageContent header={header}>{children}</PageContent>
      )}
    </Page>
  );
}
