'use client';

import { Link, useNavigate } from '@tanstack/react-router';
import {
  createContext,
  useContext,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';

import { useDesktopMedia } from '@/hooks/use-desktop-media';
import type { MasterDetailDestination } from '@/lib/master-detail-destination';

const PreferListingWorkspaceContext = createContext(false);

type InPlaceSelect = (
  event: ReactMouseEvent<HTMLAnchorElement>,
  resultId: string,
) => void;

const InPlaceListingSelectContext = createContext<InPlaceSelect | null>(null);

/** Homepage rails: unmodified desktop clicks open the family's listing workspace. */
export function PreferListingWorkspace({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  return (
    <PreferListingWorkspaceContext.Provider value={true}>
      {children}
    </PreferListingWorkspaceContext.Provider>
  );
}

/** Listing compositions: unmodified desktop clicks select in place via `onSelect`. */
export function InPlaceListingSelect({
  onSelect,
  children,
}: {
  onSelect: InPlaceSelect;
  children: ReactNode;
}): React.ReactElement {
  return (
    <InPlaceListingSelectContext.Provider value={onSelect}>
      {children}
    </InPlaceListingSelectContext.Provider>
  );
}

type MasterDetailLinkProps = {
  destination: MasterDetailDestination;
  openInNewTab?: boolean;
  children: ReactNode;
} & Omit<
  React.ComponentProps<typeof Link>,
  'to' | 'params' | 'search' | 'href' | 'children'
>;

function isModifiedClick(event: ReactMouseEvent<HTMLAnchorElement>) {
  return (
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  );
}

/**
 * Always renders a TanStack `Link` to `destination.canonical`. Providers only
 * rewrite unmodified desktop primary clicks (in-place select wins over prefer-listing).
 */
export function MasterDetailLink({
  destination,
  openInNewTab = false,
  children,
  onClick: userOnClick,
  preload,
  ...rest
}: MasterDetailLinkProps): React.ReactElement {
  const preferListing = useContext(PreferListingWorkspaceContext);
  const onSelectInPlace = useContext(InPlaceListingSelectContext);
  const isDesktop = useDesktopMedia();
  const navigate = useNavigate();
  const rewriteOnDesktop = preferListing || Boolean(onSelectInPlace);

  function onClick(event: ReactMouseEvent<HTMLAnchorElement>) {
    userOnClick?.(event);
    if (
      event.defaultPrevented ||
      openInNewTab ||
      isModifiedClick(event)
    ) {
      return;
    }

    if (isDesktop && onSelectInPlace) {
      onSelectInPlace(event, destination.selectionKey);
      return;
    }

    if (isDesktop && preferListing) {
      event.preventDefault();
      void navigate(destination.listing);
    }
  }

  const newTabProps = openInNewTab
    ? { target: '_blank' as const, rel: 'noopener noreferrer' }
    : {};

  return (
    <Link
      {...destination.canonical}
      {...rest}
      // Canonical href is always rendered; desktop rewrite targets differ, so
      // do not intent-preload the wrong route on hover.
      preload={rewriteOnDesktop ? false : preload}
      onClick={onClick}
      {...newTabProps}
    >
      {children}
    </Link>
  );
}
