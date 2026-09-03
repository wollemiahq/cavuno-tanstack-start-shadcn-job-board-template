import { describe, expect, it } from 'vitest';

import { ogImageSrc, type ImageFetch } from './og-image';

const PNG = [0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0, 0, 0, 0];
const JPEG = [0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0];
const GIF = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0, 0, 0, 0, 0, 0];
const SVG = [...'<?xml version'].map((c) => c.charCodeAt(0));
const WEBP = [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50];
// AVIF written by libheif: the major brand is `mif1`, not `avif`.
const AVIF_MIF1 = [
  0,
  0,
  0,
  0x20,
  ...[...'ftypmif1'].map((c) => c.charCodeAt(0)),
];

const URL_ = 'https://files.example/logo';

interface Call {
  url: string;
  init?: { cf?: { image?: unknown; cacheTtl?: number } };
}

/** Answers the sniff with `first`, the transform re-fetch with `second`. */
function fakeFetch(first: number[] | Response, second?: number[]) {
  const calls: Call[] = [];
  const fetchImpl: ImageFetch = async (url, init) => {
    calls.push({ url, init });
    const body = calls.length === 1 ? first : second;
    if (body instanceof Response) return body;
    if (!body) throw new Error('unexpected fetch');
    return new Response(new Uint8Array(body));
  };
  return { fetchImpl, calls };
}

describe('ogImageSrc', () => {
  it('returns null without fetching when there is no url', async () => {
    const { fetchImpl, calls } = fakeFetch(PNG);
    expect(await ogImageSrc(null, fetchImpl)).toBeNull();
    expect(await ogImageSrc(undefined, fetchImpl)).toBeNull();
    expect(calls).toHaveLength(0);
  });

  it.each([
    ['PNG', PNG],
    ['JPEG', JPEG],
    ['GIF', GIF],
    ['SVG', SVG],
  ])('passes a %s through on one edge-cached request', async (_name, bytes) => {
    const { fetchImpl, calls } = fakeFetch(bytes);
    expect(await ogImageSrc(URL_, fetchImpl)).toBe(URL_);
    expect(calls).toHaveLength(1);
    expect(calls[0].init?.cf?.cacheTtl).toBe(86400);
  });

  it('transforms WebP to an inline PNG', async () => {
    const { fetchImpl, calls } = fakeFetch(WEBP, PNG);
    expect(await ogImageSrc(URL_, fetchImpl)).toBe(
      'data:image/png;base64,iVBORwAAAAAAAAAA',
    );
    expect(calls[1].init?.cf?.image).toEqual({ format: 'png', width: 256 });
  });

  it('transforms an AVIF whose major brand is not `avif`', async () => {
    const { fetchImpl } = fakeFetch(AVIF_MIF1, PNG);
    expect(await ogImageSrc(URL_, fetchImpl)).toMatch(
      /^data:image\/png;base64,iVBORw/,
    );
  });

  it('encodes a PNG larger than one fromCharCode chunk', async () => {
    const big = [...PNG, ...Array.from({ length: 40_000 }, (_, i) => i % 256)];
    const { fetchImpl } = fakeFetch(WEBP, big);
    const src = await ogImageSrc(URL_, fetchImpl);
    const decoded = atob((src ?? '').replace('data:image/png;base64,', ''));
    expect([...decoded].map((c) => c.charCodeAt(0))).toEqual(big);
  });

  it('drops the image when transformations are off and WebP comes back', async () => {
    const { fetchImpl } = fakeFetch(WEBP, WEBP);
    expect(await ogImageSrc(URL_, fetchImpl)).toBeNull();
  });

  it('drops the image on a non-ok response', async () => {
    const { fetchImpl } = fakeFetch(new Response('', { status: 404 }));
    expect(await ogImageSrc(URL_, fetchImpl)).toBeNull();
  });

  it('never throws when the fetch does', async () => {
    const fetchImpl: ImageFetch = async () => {
      throw new Error('timed out');
    };
    expect(await ogImageSrc(URL_, fetchImpl)).toBeNull();
  });
});
