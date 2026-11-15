import { describe, expect, it } from 'vitest';

import { robotsResponse } from './seo-handlers';

const CONTENT_SIGNAL = 'Content-Signal: search=yes, ai-input=yes, ai-train=yes';

describe('robotsResponse', () => {
  it('says how search and AI may use the board under User-Agent: *', async () => {
    const body = await robotsResponse({
      canonicalBase: 'https://board.example',
    }).text();
    expect(body.split('\n').slice(0, 3)).toEqual([
      'User-Agent: *',
      CONTENT_SIGNAL,
      'Allow: /',
    ]);
  });

  it('leaves the signal out of a sandbox board, which allows no crawling', async () => {
    const body = await robotsResponse({
      canonicalBase: 'https://board.example',
      sandbox: true,
    }).text();
    expect(body).toBe('User-Agent: *\nDisallow: /\n');
  });
});
