import type { DataSource } from './data-source';

export interface BoardClientRegistryEnv {
  apiUrl: string;
  board: string;
  demoBoard?: string;
}

export interface BoardClientRegistryDependencies<
  Client,
  Refresher,
  RequestHook,
> {
  createClient: (options: {
    baseUrl: string;
    board: string;
    onRequest: RequestHook;
  }) => Client;
  createRefresher: (client: Client) => Refresher;
  getDataSource: () => DataSource;
  getServerEnv: () => BoardClientRegistryEnv;
  onRequest: RequestHook;
}

/** Lazily owns one board client and session refresher per data source. */
export function createBoardClientRegistry<Client, Refresher, RequestHook>(
  dependencies: BoardClientRegistryDependencies<Client, Refresher, RequestHook>,
) {
  let primaryClient: Client | null = null;
  let demoClient: Client | null = null;
  let primaryRefresher: Refresher | null = null;
  let demoRefresher: Refresher | null = null;

  function createClient(board: string): Client {
    const { apiUrl } = dependencies.getServerEnv();
    return dependencies.createClient({
      baseUrl: apiUrl,
      board,
      onRequest: dependencies.onRequest,
    });
  }

  function getPrimaryBoard(): Client {
    if (!primaryClient) {
      primaryClient = createClient(dependencies.getServerEnv().board);
    }
    return primaryClient;
  }

  function getDemoBoard(): Client | null {
    const { demoBoard } = dependencies.getServerEnv();
    if (!demoBoard) return null;
    if (!demoClient) demoClient = createClient(demoBoard);
    return demoClient;
  }

  function getActiveBoard(): Client {
    if (dependencies.getDataSource() === 'demo') {
      const demo = getDemoBoard();
      if (demo) return demo;
    }
    return getPrimaryBoard();
  }

  function getPreviewBoard(): Client {
    return getDemoBoard() ?? getPrimaryBoard();
  }

  function getPrimarySessionRefresher(): Refresher {
    if (!primaryRefresher) {
      primaryRefresher = dependencies.createRefresher(getPrimaryBoard());
    }
    return primaryRefresher;
  }

  function getDemoSessionRefresher(): Refresher {
    if (!demoRefresher) {
      const demo = getDemoBoard();
      if (!demo) {
        throw new Error(
          'getDemoSessionRefresher() requires CAVUNO_DEMO_BOARD to be set',
        );
      }
      demoRefresher = dependencies.createRefresher(demo);
    }
    return demoRefresher;
  }

  function getActiveSessionRefresher(): Refresher {
    if (
      dependencies.getDataSource() === 'demo' &&
      Boolean(dependencies.getServerEnv().demoBoard)
    ) {
      return getDemoSessionRefresher();
    }
    return getPrimarySessionRefresher();
  }

  function getSessionRefresherFor(source: DataSource): Refresher {
    if (source === 'demo' && dependencies.getServerEnv().demoBoard) {
      return getDemoSessionRefresher();
    }
    return getPrimarySessionRefresher();
  }

  function reset(): void {
    primaryClient = null;
    demoClient = null;
    primaryRefresher = null;
    demoRefresher = null;
  }

  return {
    getActiveBoard,
    getActiveSessionRefresher,
    getDemoBoard,
    getDemoSessionRefresher,
    getPreviewBoard,
    getPrimaryBoard,
    getPrimarySessionRefresher,
    getSessionRefresherFor,
    reset,
  };
}
