import { beforeEach, describe, expect, it } from 'vitest';

import { createBoardClientRegistry } from './board-client-registry';

/**
 * Dual-source board clients (DMO-01 / CAV-531): one lazily-created
 * singleton + session refresher per data source. getActiveBoard selects
 * by the data-source cookie; getPreviewBoard always prefers the demo
 * client when a demo key is configured (personas live on the demo tenant).
 */

interface EnvState {
  apiUrl: string;
  board: string;
  demoBoard: string | undefined;
  demoBoardPrivate: boolean;
}

interface DataSourceState {
  source: 'board' | 'demo';
}

const envState: EnvState = {
  apiUrl: 'https://api.example.test',
  board: 'pk_primary',
  demoBoard: undefined,
  demoBoardPrivate: false,
};

const dataSourceState: DataSourceState = {
  source: 'board',
};

interface TestClient {
  board: string;
  kind: 'sdk';
}

interface TestRefresher {
  board: string;
  kind: 'refresher';
}

const clients: TestClient[] = [];
const refreshers: TestRefresher[] = [];
const registry = createBoardClientRegistry({
  createClient: ({ board }): TestClient => {
    const client: TestClient = { board, kind: 'sdk' };
    clients.push(client);
    return client;
  },
  createRefresher: (client): TestRefresher => {
    const refresher: TestRefresher = {
      board: client.board,
      kind: 'refresher',
    };
    refreshers.push(refresher);
    return refresher;
  },
  getDataSource: () => dataSourceState.source,
  getServerEnv: () => envState,
  onRequest: () => {},
});

const {
  getActiveBoard,
  getActiveSessionRefresher,
  getDemoBoard,
  getDemoSessionRefresher,
  getPreviewBoard,
  getPrimaryBoard,
  getPrimarySessionRefresher,
  reset,
} = registry;

beforeEach(() => {
  envState.demoBoard = undefined;
  envState.demoBoardPrivate = false;
  dataSourceState.source = 'board';
  clients.length = 0;
  refreshers.length = 0;
  reset();
});

describe('getActiveBoard (T1 + T2)', () => {
  it('T1: env absent ⇒ no demo client is constructed; active is primary', () => {
    envState.demoBoard = undefined;
    dataSourceState.source = 'demo'; // cookie would say demo, but no key

    const active = getActiveBoard();
    expect(active).toBe(getPrimaryBoard());
    expect(getDemoBoard()).toBeNull();
    expect(clients.map((client) => client.board)).toEqual(['pk_primary']);
  });

  it('T2: demo key + cookie demo ⇒ demo client; board/absent ⇒ primary', () => {
    envState.demoBoard = 'pk_demo';

    dataSourceState.source = 'demo';
    const demoActive = getActiveBoard();
    expect(demoActive).toBe(getDemoBoard());
    expect(demoActive).not.toBe(getPrimaryBoard());
    expect(demoActive.board).toBe('pk_demo');

    dataSourceState.source = 'board';
    expect(getActiveBoard()).toBe(getPrimaryBoard());
    expect(getActiveBoard().board).toBe('pk_primary');
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
    expect(preview.board).toBe('pk_demo');
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
    expect(getPreviewBoard().board).toBe('pk_demo');
  });
});
