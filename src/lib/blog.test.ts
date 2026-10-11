import { describe, expect, it } from 'vitest';

import { featuredPostsFirst } from './blog';

const post = (id: string, featured = false) => ({ id, featured });

describe('featuredPostsFirst', () => {
  it('puts featured posts first, then the chronological posts they do not repeat', () => {
    const featured = [post('f-old', true), post('c2', true)];
    const chronological = [post('c1'), post('c2', true), post('c3')];

    expect(
      featuredPostsFirst(featured, chronological).map((p) => p.id),
    ).toEqual(['f-old', 'c2', 'c1', 'c3']);
  });

  it('keeps the chronological order unchanged when nothing is featured', () => {
    const chronological = [post('c1'), post('c2'), post('c3')];

    expect(featuredPostsFirst([], chronological)).toEqual(chronological);
  });

  it('caps the merged list when a limit is given', () => {
    const featured = [post('f1', true), post('f2', true)];
    const chronological = [post('c1'), post('f1', true), post('c2')];

    expect(
      featuredPostsFirst(featured, chronological, 3).map((p) => p.id),
    ).toEqual(['f1', 'f2', 'c1']);
  });

  it('never repeats a post the featured list itself returned twice', () => {
    const featured = [post('f1', true), post('f1', true)];

    expect(featuredPostsFirst(featured, [post('c1')]).map((p) => p.id)).toEqual(
      ['f1', 'c1'],
    );
  });
});
