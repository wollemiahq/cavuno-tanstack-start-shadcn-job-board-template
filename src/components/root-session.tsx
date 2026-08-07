'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  getRootSessionShellData,
  resolveRootHasAccessGrant,
} from '../server/root-shell';

import type { BoardUser, CompanyMembership } from '@cavuno/board';

/** Default preview shape while session shell has not resolved yet. */
export const EMPTY_ROOT_PREVIEW = {
  capability: {
    canPreview: false as const,
    reason: 'not-sandbox' as const,
  },
  personas: [] as Awaited<
    ReturnType<typeof getRootSessionShellData>
  >['preview']['personas'],
  demoConfigured: false,
  demoBoardPrivate: false,
  dataSource: 'board' as const,
};

export type RootSessionValue = {
  user: BoardUser | null;
  employerCompanies: CompanyMembership[] | null;
  hasAccessGrant: boolean;
  preview: typeof EMPTY_ROOT_PREVIEW | Awaited<
    ReturnType<typeof getRootSessionShellData>
  >['preview'];
  /** True after the first client session fetch settles (success or failure). */
  ready: boolean;
};

const RootSessionContext = createContext<RootSessionValue>({
  user: null,
  employerCompanies: null,
  hasAccessGrant: false,
  preview: EMPTY_ROOT_PREVIEW,
  ready: false,
});

/**
 * Loads signed-in chrome (user, employer memberships, paywall grant, preview
 * toolbar) after first paint. Public SSR never waits on these.
 */
export function RootSessionProvider({
  candidatePaywall,
  children,
}: {
  candidatePaywall: boolean;
  children: ReactNode;
}) {
  const [session, setSession] = useState<RootSessionValue>({
    user: null,
    employerCompanies: null,
    hasAccessGrant: false,
    preview: EMPTY_ROOT_PREVIEW,
    ready: false,
  });

  useEffect(() => {
    let cancelled = false;
    void getRootSessionShellData()
      .then((data) => {
        if (cancelled) return;
        setSession({
          user: data.user,
          employerCompanies: data.employerCompanies,
          hasAccessGrant: resolveRootHasAccessGrant(
            candidatePaywall,
            data.hasGrant,
          ),
          preview: data.preview,
          ready: true,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setSession((prev) => ({ ...prev, ready: true }));
      });
    return () => {
      cancelled = true;
    };
  }, [candidatePaywall]);

  const value = useMemo(() => session, [session]);

  return (
    <RootSessionContext.Provider value={value}>
      {children}
    </RootSessionContext.Provider>
  );
}

export function useRootSession(): RootSessionValue {
  return useContext(RootSessionContext);
}
