import { describe, expect, it } from 'vitest';

import { ogImageSrc, type ImageFetch } from './og-image';

const PNG = [0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0, 0, 0, 0];
const JPEG = [0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0];
const GIF = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0, 0, 0, 0, 0, 0];
const WEBP = [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50];

const ascii = (text: string) => [...text].map((c) => c.charCodeAt(0));

const URL_ = 'https://files.example/logo';

interface Call {
  init?: {
    headers?: HeadersInit;
    cf?: { image?: unknown; cacheTtl?: number };
  };
}

/** Answers the sniff with `first`, the transform re-fetch with `second`. */
function fakeFetch(first: number[] | Response, second?: number[]) {
  const calls: Call[] = [];
  const fetchImpl: ImageFetch = async (_url, init) => {
    calls.push({ init });
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
    ['an SVG behind an XML prolog', ascii('<?xml version="1.0"')],
  ])('passes %s through untouched', async (_name, bytes) => {
    const { fetchImpl, calls } = fakeFetch(bytes);
    expect(await ogImageSrc(URL_, fetchImpl)).toBe(URL_);
    expect(calls).toHaveLength(1);
  });

  it('sniffs with a Range header and an edge TTL', async () => {
    const { fetchImpl, calls } = fakeFetch(PNG);
    await ogImageSrc(URL_, fetchImpl);
    expect(new Headers(calls[0].init?.headers).get('Range')).toBe('bytes=0-15');
    expect(calls[0].init?.cf?.cacheTtl).toBe(86400);
  });

  // Satori takes its SVG text path off the content-type, so a `<!DOCTYPE` or
  // comment-led SVG renders fine and must not be rewritten.
  it('passes an SVG through on its content-type alone', async () => {
    const svg = new Response(new Uint8Array(ascii('<!DOCTYPE svg PUBLIC')), {
      headers: { 'content-type': 'image/svg+xml' },
    });
    const { fetchImpl } = fakeFetch(svg);
    expect(await ogImageSrc(URL_, fetchImpl)).toBe(URL_);
  });

  // A bare `<svg …>` served as octet-stream is what Satori's own byte sniffer
  // misses, so it has to go through the transform rather than be trusted.
  it('transforms a bare <svg> that Satori would not detect', async () => {
    const { fetchImpl, calls } = fakeFetch(ascii('<svg xmlns="http'), PNG);
    await ogImageSrc(URL_, fetchImpl);
    expect(calls).toHaveLength(2);
  });

  it('transforms WebP to an inline PNG', async () => {
    const { fetchImpl, calls } = fakeFetch(WEBP, PNG);
    expect(await ogImageSrc(URL_, fetchImpl)).toBe(
      'data:image/png;base64,iVBORwAAAAAAAAAA',
    );
    expect(calls[1].init?.cf?.image).toEqual({ format: 'png', width: 256 });
  });

  it('encodes a PNG past the fromCharCode argument limit', async () => {
    const big = [...PNG, ...Array.from({ length: 200_000 }, (_, i) => i % 256)];
    const { fetchImpl } = fakeFetch(WEBP, big);
    const src = await ogImageSrc(URL_, fetchImpl);
    const base64 = (src ?? '').replace('data:image/png;base64,', '');
    const decoded = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    expect(decoded).toEqual(new Uint8Array(big));
  });

  it('drops the image when transformations are off and WebP comes back', async () => {
    const { fetchImpl } = fakeFetch(WEBP, WEBP);
    expect(await ogImageSrc(URL_, fetchImpl)).toBeNull();
  });

  it('drops a body too short to identify without paying for a transform', async () => {
    const { fetchImpl, calls } = fakeFetch([]);
    expect(await ogImageSrc(URL_, fetchImpl)).toBeNull();
    expect(calls).toHaveLength(1);
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
