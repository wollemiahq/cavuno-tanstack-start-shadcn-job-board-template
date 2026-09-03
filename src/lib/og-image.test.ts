import { describe, expect, it } from 'vitest';

import { ogImageSrc, type ImageFetch } from './og-image';

const PNG = [0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0, 0, 0, 0];
// "RIFF" + 4 size bytes + "WEBP"
const WEBP = [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50];
// 4 size bytes + "ftypavif"
const AVIF = [0, 0, 0, 0, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66];

const URL_ = 'https://files.example/logo';

interface Call {
  url: string;
  init?: { cf?: { image?: unknown }; headers?: HeadersInit };
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

  it('passes a decodable image straight through on one range request', async () => {
    const { fetchImpl, calls } = fakeFetch(PNG);
    expect(await ogImageSrc(URL_, fetchImpl)).toBe(URL_);
    expect(calls).toHaveLength(1);
    expect(new Headers(calls[0].init?.headers).get('Range')).toBe('bytes=0-15');
  });

  it('transforms WebP to an inline PNG', async () => {
    const { fetchImpl, calls } = fakeFetch(WEBP, PNG);
    const src = await ogImageSrc(URL_, fetchImpl);
    expect(src).toBe(
      `data:image/png;base64,${btoa(String.fromCharCode(...PNG))}`,
    );
    expect(calls[1].init?.cf?.image).toEqual({ format: 'png', width: 256 });
  });

  it('transforms AVIF the same way', async () => {
    const { fetchImpl } = fakeFetch(AVIF, PNG);
    expect(await ogImageSrc(URL_, fetchImpl)).toMatch(
      /^data:image\/png;base64,/,
    );
  });

  it('drops the image when transformations are off and WebP comes back', async () => {
    const { fetchImpl } = fakeFetch(WEBP, WEBP);
    expect(await ogImageSrc(URL_, fetchImpl)).toBeNull();
  });

  it('drops the image on a non-ok response', async () => {
    const { fetchImpl } = fakeFetch(new Response('', { status: 404 }));
    expect(await ogImageSrc(URL_, fetchImpl)).toBeNull();
  });

  it('drops the image when the body is too short to identify', async () => {
    const { fetchImpl } = fakeFetch([0x89, 0x50]);
    expect(await ogImageSrc(URL_, fetchImpl)).toBeNull();
  });

  it('never throws when the fetch does', async () => {
    const fetchImpl: ImageFetch = async () => {
      throw new Error('timed out');
    };
    expect(await ogImageSrc(URL_, fetchImpl)).toBeNull();
  });
});
