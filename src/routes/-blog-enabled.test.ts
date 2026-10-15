import { isNotFound } from '@tanstack/react-router';
import { describe, expect, it } from 'vitest';

import { loadIfBlogEnabled } from './-blog-enabled';

async function outcome(promise: Promise<unknown>) {
  try {
    return { value: await promise };
  } catch (error) {
    return { error };
  }
}

describe('loadIfBlogEnabled', () => {
  it('returns the page when the blog is on', async () => {
    expect(
      await loadIfBlogEnabled(
        async () => true,
        async () => 'page',
      ),
    ).toBe('page');
  });

  it('answers 404 when the blog is off, even if the page read succeeded', async () => {
    const { error } = await outcome(
      loadIfBlogEnabled(
        async () => false,
        async () => 'page',
      ),
    );
    expect(isNotFound(error)).toBe(true);
  });

  it('surfaces a failed flag read rather than a 404', async () => {
    const failure = new Error('context unavailable');
    const { error } = await outcome(
      loadIfBlogEnabled(
        () => Promise.reject(failure),
        async () => 'page',
      ),
    );
    expect(error).toBe(failure);
  });

  it('passes a page error through when the blog is on', async () => {
    const failure = new Error('upstream 500');
    const { error } = await outcome(
      loadIfBlogEnabled(
        async () => true,
        () => Promise.reject(failure),
      ),
    );
    expect(error).toBe(failure);
  });
});
