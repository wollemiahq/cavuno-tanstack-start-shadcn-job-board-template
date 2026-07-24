import { Bleed } from '@/components/layout/bleed';
import { Page, PageContent } from '@/components/layout/page';

type PageLayoutRailProps =
  | { rail?: never; railLabel?: never }
  | { rail: React.ReactNode; railLabel: string };

type PageLayoutProps = PageLayoutRailProps & {
  /** Full-bleed section rendered above the constrained content. */
  band?: React.ReactNode;
  children: React.ReactNode;
};

/** Reusable Page-family composition with a full-bleed header and optional rail. */
export function PageLayout({
  band,
  rail,
  railLabel,
  children,
}: PageLayoutProps) {
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
