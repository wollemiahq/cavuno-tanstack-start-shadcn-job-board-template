import { describe, expect, it } from 'vitest';

import { ogImageSrc, type ImageFetch } from './og-image';

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0];
const JPEG = [0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0];
const GIF = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0, 0, 0, 0, 0, 0];
const WEBP = [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50];
const EMPTY: number[] = [];

const ascii = (text: string) => [...text].map((c) => c.charCodeAt(0));

const PROLOG = '<?xml version="1.0"';

const URL_ = 'https://files.example/logo';

type Init = Parameters<ImageFetch>[1];

/** Answers the sniff with `first`, the transform re-fetch with `second`. */
function fakeFetch(first: number[] | Response, second?: number[]) {
  const calls: Init[] = [];
  const fetchImpl: ImageFetch = async (_url, init) => {
    calls.push(init);
    const body = calls.length === 1 ? first : second;
    if (body instanceof Response) return body;
    if (!body) throw new Error('unexpected fetch');
    return new Response(new Uint8Array(body));
  };
  return { fetchImpl, calls };
}

const svgResponse = (body: string, contentType: string) =>
  new Response(new Uint8Array(ascii(body)), {
    headers: { 'content-type': contentType },
  });

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
  ])('passes %s through untouched', async (_name, bytes) => {
    const { fetchImpl, calls } = fakeFetch(bytes);
    expect(await ogImageSrc(URL_, fetchImpl)).toBe(URL_);
    expect(calls).toHaveLength(1);
  });

  it('sniffs with a Range header and an edge TTL', async () => {
    const { fetchImpl, calls } = fakeFetch(PNG);
    await ogImageSrc(URL_, fetchImpl);
    expect(new Headers(calls[0]?.headers).get('Range')).toBe('bytes=0-15');
    expect(calls[0]?.cf?.cacheTtl).toBe(86400);
  });

  it('passes an SVG through on an exact svg content-type', async () => {
    const { fetchImpl } = fakeFetch(
      svgResponse('<!DOCTYPE svg PUBLIC', 'image/svg+xml'),
    );
    expect(await ogImageSrc(URL_, fetchImpl)).toBe(URL_);
  });

  // A charset parameter fails Satori's `===`, and its byte detector reaches a
  // switch with no SVG branch. Either way it cannot draw one, so both have to
  // be rasterised rather than handed over as a URL.
  it.each([
    [
      'a charset on its content-type',
      svgResponse(PROLOG, 'image/svg+xml; charset=utf-8'),
    ],
    ['its bytes alone', svgResponse(PROLOG, 'application/octet-stream')],
  ])('transforms an SVG identified by %s', async (_name, first) => {
    const { fetchImpl, calls } = fakeFetch(first, PNG);
    await ogImageSrc(URL_, fetchImpl);
    expect(calls).toHaveLength(2);
  });

  it('transforms WebP to an inline PNG', async () => {
    const { fetchImpl, calls } = fakeFetch(WEBP, PNG);
    expect(await ogImageSrc(URL_, fetchImpl)).toBe(
      'data:image/png;base64,iVBORw0KGgoAAAAA',
    );
    expect(calls[1]?.cf?.image).toEqual({ format: 'png', width: 256 });
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

  // The sniff already proved Satori cannot draw it, so a transform that
  // throws must still drop the element rather than hand the URL back.
  it('drops the image when the transform throws', async () => {
    const fetchImpl: ImageFetch = async (_url, init) => {
      if (init?.cf?.image) throw new Error('timed out');
      return new Response(new Uint8Array(WEBP));
    };
    expect(await ogImageSrc(URL_, fetchImpl)).toBeNull();
  });

  // A sniff that fails identifies nothing, so the URL goes to Satori exactly
  // as it did before this module existed — never dropped on a guess.
  it.each([
    ['a non-ok response', new Response('', { status: 416 })],
    ['an empty body', EMPTY],
  ])('leaves the url untouched on %s', async (_name, first) => {
    const { fetchImpl, calls } = fakeFetch(first);
    expect(await ogImageSrc(URL_, fetchImpl)).toBe(URL_);
    expect(calls).toHaveLength(1);
  });

  it('leaves the url untouched when the fetch throws', async () => {
    const fetchImpl: ImageFetch = async () => {
      throw new Error('timed out');
    };
    expect(await ogImageSrc(URL_, fetchImpl)).toBe(URL_);
  });
});
