import { type BoardAuthSession } from '@cavuno/board';
import {
  clearGrantCookie,
  clearSessionCookie,
  parseGrantCookie,
  parseSessionCookie,
  serializeGrantCookie,
  serializeSessionCookie,
  type BoardSession,
} from '@cavuno/board/server';

import { resolveDataSource, type DataSource } from './data-source';

export interface DataSourceServerEnv {
  demoBoard?: string;
  demoBoardPrivate: boolean;
}

export interface DataSourceRuntimeDependencies {
  getServerEnv: () => DataSourceServerEnv;
  getRequestHeader: (name: string) => string | null | undefined;
  setResponseHeader: (name: string, value: string) => void;
}

type SessionCookieOptions = {
  board?: string;
};

/** Typed provider for env- and request-backed data-source policy. */
export function createDataSourceRuntime(
  dependencies: DataSourceRuntimeDependencies,
) {
  function isDemoBoardConfigured(): boolean {
    return Boolean(dependencies.getServerEnv().demoBoard);
  }

  function isDemoBoardPrivate(): boolean {
    return dependencies.getServerEnv().demoBoardPrivate === true;
  }

  function getDataSource(): DataSource {
    return resolveDataSource(
      dependencies.getRequestHeader('cookie') ?? null,
      isDemoBoardConfigured(),
    );
  }

  function sessionCookieOptionsFor(source: DataSource): SessionCookieOptions {
    if (source === 'demo') {
      const demoBoard = dependencies.getServerEnv().demoBoard;
      if (demoBoard) return { board: demoBoard };
    }
    return {};
  }

  function previewSessionSource(): DataSource {
    return isDemoBoardConfigured() ? 'demo' : 'board';
  }

  function serializeSessionForSource(
    session: BoardSession,
    source: DataSource,
  ): string {
    return serializeSessionCookie(session, sessionCookieOptionsFor(source));
  }

  function parseSessionForSource(
    cookieHeader: string | null,
    source: DataSource,
  ): BoardSession | null {
    return parseSessionCookie(cookieHeader, sessionCookieOptionsFor(source));
  }

  function clearSessionForSource(source: DataSource): string {
    return clearSessionCookie(sessionCookieOptionsFor(source));
  }

  function serializeGrantForSource(token: string, source: DataSource): string {
    return serializeGrantCookie(token, sessionCookieOptionsFor(source));
  }

  function parseGrantForSource(
    cookieHeader: string | null,
    source: DataSource,
  ): string | null {
    return parseGrantCookie(cookieHeader, sessionCookieOptionsFor(source));
  }

  function clearGrantForSource(source: DataSource): string {
    return clearGrantCookie(sessionCookieOptionsFor(source));
  }

  function persistAuthSession(session: BoardAuthSession): BoardSession {
    const next: BoardSession = {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      expiresAt: session.expiresAt,
    };
    dependencies.setResponseHeader(
      'Set-Cookie',
      serializeSessionForSource(next, getDataSource()),
    );
    return next;
  }

  return {
    clearGrantForSource,
    clearSessionForSource,
    getDataSource,
    isDemoBoardConfigured,
    isDemoBoardPrivate,
    parseGrantForSource,
    parseSessionForSource,
    persistAuthSession,
    previewSessionSource,
    serializeGrantForSource,
    serializeSessionForSource,
    sessionCookieOptionsFor,
  };
}
