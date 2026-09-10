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

import { listCompanies } from '../server/employers';
import {
  getRootSessionEntitlements,
  getRootSessionShellData,
  resolveRootHasAccessGrant,
} from '../server/root-shell';
import { EMPTY_GRANT, type TalentAccessGrant } from '../server/talent-access';

import type { BoardUser, CompanyMembership } from '@cavuno/board';

const EMPTY_TALENT_ACCESS: TalentAccessGrant = EMPTY_GRANT;

type RootPreview = Awaited<
  ReturnType<typeof getRootSessionEntitlements>
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
  devToolsEnabled: false,
};

export type RootSessionValue = {
  user: BoardUser | null;
  employerCompanies: CompanyMembership[] | null;
  hasAccessGrant: boolean;
  talentAccess: TalentAccessGrant;
  preview:
    | typeof EMPTY_ROOT_PREVIEW
    | Awaited<ReturnType<typeof getRootSessionEntitlements>>['preview'];
  /** True after the first client session fetch settles (success or failure). */
  ready: boolean;
};

type RootSessionContextValue = RootSessionValue & {
  clearSession: () => void;
};

export interface RootSessionDependencies {
  getSessionShell: () => Promise<
    Awaited<ReturnType<typeof getRootSessionShellData>>
  >;
  getEntitlements: () => Promise<
    Awaited<ReturnType<typeof getRootSessionEntitlements>>
  >;
  getCompanies: () => Promise<Awaited<ReturnType<typeof listCompanies>>>;
  resolveHasAccessGrant: (
    candidatePaywall: boolean,
    hasGrant: boolean,
  ) => boolean;
}

const rootSessionDependencies: RootSessionDependencies = {
  getSessionShell: getRootSessionShellData,
  getEntitlements: getRootSessionEntitlements,
  getCompanies: listCompanies,
  resolveHasAccessGrant: resolveRootHasAccessGrant,
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
  dependencies = rootSessionDependencies,
}: {
  candidatePaywall: boolean;
  children: ReactNode;
  dependencies?: RootSessionDependencies;
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
    void dependencies
      .getSessionShell()
      .then((data) => {
        if (cancelled) return;
        if (!data || !('user' in data)) {
          throw new TypeError('Invalid root session shell response');
        }
        const user = data.user;
        setSession((current) => ({
          ...current,
          user,
          ready: true,
        }));
        if (user?.emailVerified) {
          void dependencies
            .getCompanies()
            .then((result) => {
              if (cancelled) return;
              if (!result || !Array.isArray(result.data)) {
                throw new TypeError('Invalid employer companies response');
              }
              const employerCompanies = result.data;
              setSession((current) => ({
                ...current,
                employerCompanies,
              }));
            })
            .catch(() => undefined);
        }
        return dependencies.getEntitlements();
      })
      .then((data) => {
        if (cancelled || !data) return;
        const hasAccessGrant = dependencies.resolveHasAccessGrant(
          candidatePaywall,
          data.hasGrant,
        );
        const talentAccess = data.talentAccess;
        const preview = data.preview;
        setSession((current) => ({
          ...current,
          hasAccessGrant,
          talentAccess,
          preview,
        }));
      })
      .catch(() => {
        if (cancelled) return;
        setSession((current) => ({ ...current, ready: true }));
      });
    return () => {
      cancelled = true;
    };
  }, [candidatePaywall, dependencies]);

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
