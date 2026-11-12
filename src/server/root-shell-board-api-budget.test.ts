/**
 * The public root shell runs on every document render and every soft
 * navigation, so each Board API call it makes multiplies by the board's whole
 * page traffic. This pins the full set of calls one cold render makes, through
 * the real root shell, queries and memos, against a client that records every
 * method called on it. A new probe in the root shell (for example calling an
 * endpoint only to decide whether to show a link) fails here: read the answer
 * from `board.context().features` instead, and ask for a flag there if the
 * API has none.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const calls = vi.hoisted((): string[] => []);

vi.mock('@tanstack/react-start', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-start')>()),
  createServerOnlyFn: <TFn>(fn: TFn) => fn,
  createServerFn: () => {
    const chain = {
      validator: () => chain,
      middleware: () => chain,
      handler:
        <TResult>(handler: (input: { context: object }) => TResult) =>
        () =>
          handler({ context: { session: null, boardAccessHeaders: {} } }),
    };
    return chain;
  },
}));
vi.mock('@tanstack/react-start/server', () => ({
  getRequest: () => new Request('https://fixture.example/page'),
}));
vi.mock('../lib/board-access-middleware', () => ({
  boardAccessMiddleware: {},
}));
vi.mock('../lib/env', () => ({
  getServerEnv: () => ({ board: 'pk_fixture' }),
}));
vi.mock('../lib/data-source.server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/data-source.server')>()),
  getDataSource: () => 'board',
}));

/** What each recorded call answers. Anything else answers an empty list. */
const RESPONSES = new Map<string, object>([
  [
    'context',
    {
      name: 'Fixture board',
      features: {
        contactPage: true,
        mcp: false,
        products: true,
        tipJar: false,
        jobRecommendationsEnabled: true,
      },
    },
  ],
  [
    'seo',
    {
      adsTxt: null,
      indexNowKey: null,
      googleSiteVerification: null,
      canonicalBase: 'https://fixture.example',
      manifest: { name: 'Fixture board' },
    },
  ],
]);

/** Any method path on the client is callable and resolves to a response. */
type RecordingClient = (() => Promise<object>) & {
  readonly [method: string]: RecordingClient;
};

/**
 * A Board client that records the dotted path of every method called, so a
 * call the root shell did not make before shows up by name.
 */
function recordingClient(path: readonly string[] = []): RecordingClient {
  const call: () => Promise<object> = async () => ({});
  // SAFETY: the get trap answers every property with another recording client and the apply trap resolves every call, which is the RecordingClient shape; TypeScript cannot see through Proxy traps.
  return new Proxy(call, {
    get: (_target, key) => recordingClient([...path, String(key)]),
    apply: async () => {
      const name = path.join('.');
      calls.push(name);
      return RESPONSES.get(name) ?? { data: [] };
    },
  }) as RecordingClient;
}

vi.mock('../lib/board', () => ({
  getBoard: () => recordingClient(),
  APPLY_GATEWAY_QUERY: { capabilities: ['apply-gateway-v1'] },
}));

import {
  resetBoardContextCache,
  resetEmployerOfferGateCache,
} from '../lib/board-context-cache';
import { getRootShellData } from './root-shell';

beforeEach(() => {
  calls.length = 0;
  resetBoardContextCache();
  resetEmployerOfferGateCache();
});

describe('root shell Board API budget', () => {
  it('a cold render reads only the context, SEO and the two plan lists', async () => {
    const shell = await getRootShellData();
    expect([...calls].sort()).toEqual([
      'context',
      'plans.list',
      'plans.list',
      'seo',
    ]);
    expect(shell.offerGate).toMatchObject({
      hasProductsPage: true,
      hasTipPage: false,
    });
  });
});
