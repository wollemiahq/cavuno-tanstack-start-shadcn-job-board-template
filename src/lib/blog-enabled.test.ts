import { describe, expect, it } from 'vitest';

import { blogDisabledResponse, isBlogEnabled } from './blog-enabled';

describe('isBlogEnabled', () => {
  it('is true only when the board context says blog: true', async () => {
    await expect(
      isBlogEnabled(async () => ({ features: { blog: true } })),
    ).resolves.toBe(true);
    await expect(
      isBlogEnabled(async () => ({ features: { blog: false } })),
    ).resolves.toBe(false);
  });

  it('propagates a failed context read so the caller decides fail-open/closed', async () => {
    await expect(
      isBlogEnabled(async () => {
        throw new Error('upstream down');
      }),
    ).rejects.toThrow('upstream down');
  });
});

describe('blogDisabledResponse', () => {
  it('is an empty HTTP 404 for RSS / OG handlers', async () => {
    const response = blogDisabledResponse();
    expect(response.status).toBe(404);
    await expect(response.text()).resolves.toBe('');
  });
});
