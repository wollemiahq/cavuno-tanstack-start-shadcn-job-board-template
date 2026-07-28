import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Dual-source board clients (DMO-01 / CAV-531): one lazily-created
 * singleton + session refresher per data source. getActiveBoard selects
 * by the data-source cookie; getPreviewBoard always prefers the demo
 * client when a demo key is configured (personas live on the demo tenant).
 */

const envState = vi.hoisted(() => ({
  apiUrl: 'https://api.example.test',
  board: 'pk_primary',
  demoBoard: undefined as string | undefined,
  demoBoardPrivate: false,
}));

const dataSourceState = vi.hoisted(() => ({
  source: 'board' as 'board' | 'demo',
}));

const created = vi.hoisted(() => ({
  clients: [] as Array<{ board: string }>,
  refreshers: [] as Array<{ board: string }>,
}));

vi.mock('cloudflare:workers', () => ({ env: {} }));

vi.mock('@tanstack/react-start/server', () => ({
  getRequestHeader: () => null,
  setResponseHeader: () => {},
}));

vi.mock('./env', () => ({
  getServerEnv: () => ({
    apiUrl: envState.apiUrl,
    board: envState.board,
    demoBoard: envState.demoBoard,
    demoBoardPrivate: envState.demoBoardPrivate,
  }),
}));

vi.mock('./data-source.server', async () => {
  const actual = await vi.importActual<typeof import('./data-source.server')>(
    './data-source.server',
  );
  return {
    ...actual,
    getDataSource: () => dataSourceState.source,
    isDemoBoardConfigured: () => typeof envState.demoBoard === 'string',
    isDemoBoardPrivate: () => envState.demoBoardPrivate,
  };
});

vi.mock('./read-cache', () => ({
  applyReadCache: vi.fn(),
}));

vi.mock('@cavuno/board', () => ({
  createBoardClient: (opts: { board: string }) => {
    const client = { board: opts.board, __kind: 'sdk' as const };
    created.clients.push(client);
    return client;
  },
}));

vi.mock('@cavuno/board/server', () => ({
  createSessionRefresher: (client: { board: string }) => {
    const refresher = { board: client.board, __kind: 'refresher' as const };
    created.refreshers.push(refresher);
    return refresher;
  },
}));

import {
  __resetBoardClientsForTests,
  getActiveBoard,
  getActiveSessionRefresher,
  getDemoBoard,
  getDemoSessionRefresher,
  getPreviewBoard,
  getPrimaryBoard,
  getPrimarySessionRefresher,
} from './board';

/** Resolve the board key our mock attached to a client instance. */
function boardKey(client: unknown): string | undefined {
  return created.clients.find((c) => c === client)?.board;
}

beforeEach(() => {
  envState.demoBoard = undefined;
  envState.demoBoardPrivate = false;
  dataSourceState.source = 'board';
  created.clients.length = 0;
  created.refreshers.length = 0;
  __resetBoardClientsForTests();
});

describe('getActiveBoard (T1 + T2)', () => {
  it('T1: env absent ⇒ no demo client is constructed; active is primary', () => {
    envState.demoBoard = undefined;
    dataSourceState.source = 'demo'; // cookie would say demo, but no key

    const active = getActiveBoard();
    expect(active).toBe(getPrimaryBoard());
    expect(getDemoBoard()).toBeNull();
    expect(created.clients.map((c) => c.board)).toEqual(['pk_primary']);
  });

  it('T2: demo key + cookie demo ⇒ demo client; board/absent ⇒ primary', () => {
    envState.demoBoard = 'pk_demo';

    dataSourceState.source = 'demo';
    const demoActive = getActiveBoard();
    expect(demoActive).toBe(getDemoBoard());
    expect(demoActive).not.toBe(getPrimaryBoard());
    expect(boardKey(demoActive)).toBe('pk_demo');

    dataSourceState.source = 'board';
    expect(getActiveBoard()).toBe(getPrimaryBoard());
    expect(boardKey(getActiveBoard())).toBe('pk_primary');
  });

  it('each data source has its own session refresher singleton', () => {
    envState.demoBoard = 'pk_demo';
    const primaryR = getPrimarySessionRefresher();
    const demoR = getDemoSessionRefresher();
    expect(primaryR).not.toBe(demoR);
    expect(getPrimarySessionRefresher()).toBe(primaryR);
    expect(getDemoSessionRefresher()).toBe(demoR);

    dataSourceState.source = 'demo';
    expect(getActiveSessionRefresher()).toBe(demoR);
    dataSourceState.source = 'board';
    expect(getActiveSessionRefresher()).toBe(primaryR);
  });
});

describe('getPreviewBoard (T4 + T6 client target)', () => {
  it('T4: capability client is the demo board when demo key is configured', () => {
    envState.demoBoard = 'pk_demo';
    dataSourceState.source = 'board'; // UI on "Your board" — preview still demo
    const preview = getPreviewBoard();
    expect(preview).toBe(getDemoBoard());
    expect(boardKey(preview)).toBe('pk_demo');
  });

  it('falls back to primary when no demo key (legacy sandbox-on-primary)', () => {
    envState.demoBoard = undefined;
    expect(getPreviewBoard()).toBe(getPrimaryBoard());
  });

  it('T6: switchPersona targets the demo client when demo key is set', () => {
    // switchPersona / roster / emails must always hit the preview client.
    envState.demoBoard = 'pk_demo';
    dataSourceState.source = 'board';
    expect(getPreviewBoard()).toBe(getDemoBoard());
    expect(boardKey(getPreviewBoard())).toBe('pk_demo');
  });
});
