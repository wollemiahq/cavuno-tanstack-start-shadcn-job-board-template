import { describe, expect, it } from 'vitest';

import { readFileSync } from 'node:fs';

describe('post-job server copy', () => {
  it('sources recoverable upload feedback from the message catalog', () => {
    const source = readFileSync(
      new URL('./server/post.ts', import.meta.url),
      'utf8',
    );

    // The server ships CODES, not words — the viewer-locale copy resolves
    // client-side in board-error-message (server-fn RPCs can't be trusted
    // to carry the viewer locale for every transport).
    expect(source).not.toContain('m.postJob_chooseImageError()');
    expect(source).toContain("code: 'invalid_file'");
    const resolver = readFileSync(
      new URL('./lib/board-error-message.ts', import.meta.url),
      'utf8',
    );
    expect(resolver).toContain('invalid_file: m.postJob_chooseImageError');
    expect(resolver).toContain(
      'job_posting_logo_not_found: m.postJob_logoNotFoundError',
    );
  });
});
