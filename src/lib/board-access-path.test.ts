import { describe, expect, it } from 'vitest';

import { boardAccessPath } from './board-access-path';

describe('password challenge return path', () => {
  it('retains a direct page request and its search filters without a Referer', () => {
    expect(boardAccessPath('https://board.example/jobs?q=robotics', null)).toBe(
      '/jobs?q=robotics',
    );
  });

  it('uses the requested page rather than the previous page on a full navigation', () => {
    expect(
      boardAccessPath(
        'https://board.example/companies/acme',
        'https://board.example/jobs',
      ),
    ).toBe('/companies/acme');
  });

  it('uses the page Referer rather than the server-function URL on an RPC', () => {
    expect(
      boardAccessPath(
        'https://board.example/_serverFn/read?payload=internal',
        'https://board.example/jobs?q=robotics',
      ),
    ).toBe('/jobs?q=robotics');
  });

  it('falls back safely when an RPC has no page Referer', () => {
    expect(boardAccessPath('https://board.example/_serverFn/read', null)).toBe(
      '/',
    );
  });
});
