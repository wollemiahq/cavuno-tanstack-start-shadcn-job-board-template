import {
  PageBreadcrumb,
  type BreadcrumbData,
} from "@/components/board/breadcrumb";
import { Container } from "@/components/layout/container";
import {
  PageHeader,
  type PageHeaderProps,
} from "@/components/layout/page";
import type { ContainerWidth } from "@/components/layout/layout.types";

/**
 * The canonical Page-family seam for a page intro that owns a breadcrumb.
 * Routes pass resolved breadcrumb data; this component alone seats the shared
 * placement primitive before the constrained PageHeader.
 */
export function PageHeaderWithBreadcrumb({
  breadcrumb,
  width = "wide",
  ...props
}: Omit<PageHeaderProps, "breadcrumb"> & {
  breadcrumb?: BreadcrumbData;
  width?: ContainerWidth;
}) {
  return (
    <>
      {breadcrumb ? (
        <PageBreadcrumb
          items={breadcrumb.items}
          ariaLabel={breadcrumb.ariaLabel}
        />
      ) : null}
      <Container width={width}>
        <PageHeader {...props} />
      </Container>
    </>
  );
}
