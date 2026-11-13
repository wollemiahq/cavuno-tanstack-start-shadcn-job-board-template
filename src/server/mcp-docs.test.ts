import { describe, expect, it } from 'vitest';

import { parseMcpToolsList } from './mcp-docs';

const reply = {
  jsonrpc: '2.0',
  id: 1,
  result: {
    tools: [
      { name: 'search_jobs', description: 'Search `jobs`.', inputSchema: {} },
      { name: 'get_job' },
    ],
  },
};

const expected = [
  { name: 'search_jobs', description: 'Search `jobs`.' },
  { name: 'get_job', description: '' },
];

describe('parseMcpToolsList', () => {
  it('reads a server-sent message event', () => {
    const body = `event: message\ndata: ${JSON.stringify(reply)}\n\n`;
    expect(parseMcpToolsList(body)).toEqual(expected);
  });

  it('reads a plain JSON reply', () => {
    expect(parseMcpToolsList(JSON.stringify(reply))).toEqual(expected);
  });

  it('rejects a JSON-RPC error', () => {
    const body = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      error: { code: -32601, message: 'Method not found' },
    });
    expect(() => parseMcpToolsList(body)).toThrow();
  });
});
