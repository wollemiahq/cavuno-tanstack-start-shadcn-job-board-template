import { describe, expect, it } from 'vitest';

import { readFileSync } from 'node:fs';

describe('post-job server copy', () => {
  it('sources recoverable upload feedback from the message catalog', () => {
    const source = readFileSync(
      new URL('./server/post.ts', import.meta.url),
      'utf8',
    );

    expect(source).toContain('m.postJob_chooseImageError()');
    expect(source).toContain('m.postJob_logoNotFoundError()');
    expect(source).not.toContain("'Choose an image file to upload.'");
    expect(source).not.toContain("'No logo found for that website.'");
  });
});
