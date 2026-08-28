'use client';

import {
  createContext,
  useCallback,
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
import { EMPTY_GRANT, type TalentAccessGrant } from '../server/talent-access';

import type { BoardUser, CompanyMembership } from '@cavuno/board';

const EMPTY_TALENT_ACCESS: TalentAccessGrant = EMPTY_GRANT;

type RootPreview = Awaited<
  ReturnType<typeof getRootSessionShellData>
>['preview'];

/** Default preview shape while session shell has not resolved yet. */
export const EMPTY_ROOT_PREVIEW: RootPreview = {
  capability: {
    canPreview: false,
    reason: 'not-sandbox',
  },
  personas: [],
  activePersonaId: null,
  demoConfigured: false,
  demoBoardPrivate: false,
  dataSource: 'board',
};

export type RootSessionValue = {
  user: BoardUser | null;
  employerCompanies: CompanyMembership[] | null;
  hasAccessGrant: boolean;
  talentAccess: TalentAccessGrant;
  preview:
    | typeof EMPTY_ROOT_PREVIEW
    | Awaited<ReturnType<typeof getRootSessionShellData>>['preview'];
  /** True after the first client session fetch settles (success or failure). */
  ready: boolean;
};

type RootSessionContextValue = RootSessionValue & {
  clearSession: () => void;
};

const RootSessionContext = createContext<RootSessionContextValue>({
  user: null,
  employerCompanies: null,
  hasAccessGrant: false,
  talentAccess: EMPTY_TALENT_ACCESS,
  preview: EMPTY_ROOT_PREVIEW,
  ready: false,
  clearSession: () => undefined,
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
    talentAccess: EMPTY_TALENT_ACCESS,
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
          talentAccess: data.talentAccess,
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

  const clearSession = useCallback(() => {
    setSession((current) => ({
      ...current,
      user: null,
      employerCompanies: null,
      hasAccessGrant: false,
      talentAccess: EMPTY_TALENT_ACCESS,
    }));
  }, []);
  const value = useMemo(
    () => ({ ...session, clearSession }),
    [clearSession, session],
  );

  return (
    <RootSessionContext.Provider value={value}>
      {children}
    </RootSessionContext.Provider>
  );
}

export function useRootSession(): RootSessionContextValue {
  return useContext(RootSessionContext);
}
