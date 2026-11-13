import { isRedirect, redirect } from '@tanstack/react-router';
import { describe, expect, it, vi } from 'vitest';

import { markdownTwinRouteRequest } from '../../lib/markdown-twin/routes';
import { serveMarkdownTwin, type MarkdownTwinBuilder } from './index';

const TWIN_URL = 'https://board.example/companies/acme/jobs/engineer.md';
const CANONICAL = 'https://hosted.example/companies/acme/jobs/engineer';

function serve(build: MarkdownTwinBuilder, url = TWIN_URL) {
  return serveMarkdownTwin(markdownTwinRouteRequest(new Request(url)), {
    job: build,
  });
}

describe('serveMarkdownTwin', () => {
  it('answers Markdown with the twin headers', async () => {
    const build = vi.fn<MarkdownTwinBuilder>(async () => ({
      type: 'markdown',
      body: '# Engineer\n',
      canonical: CANONICAL,
    }));
    const response = await serve(build);

    expect(build).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'job',
        twinPath: '/companies/acme/jobs/engineer.md',
      }),
      'https://board.example',
    );
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('# Engineer\n');
    expect(Object.fromEntries(response.headers)).toMatchObject({
      'content-type': 'text/markdown; charset=utf-8',
      'x-robots-tag': 'noindex',
      link: `<${CANONICAL}>; rel="canonical"`,
      vary: 'Accept, Cookie',
    });
  });

  it('answers a missing page with a plain-text 404', async () => {
    const response = await serve(async () => ({ type: 'notFound' }));
    expect(response.status).toBe(404);
    expect(response.headers.get('content-type')).toBe(
      'text/plain; charset=utf-8',
    );
    expect(response.headers.get('x-robots-tag')).toBe('noindex');
  });

  it('answers a move with a 308', async () => {
    const response = await serve(async () => ({
      type: 'redirect',
      location: '/companies/beta/jobs/engineer.md',
    }));
    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe(
      '/companies/beta/jobs/engineer.md',
    );
  });

  it('sends the password wall back to the twin URL, not the internal route', async () => {
    const served = serve(async () => {
      throw redirect({
        to: '/password',
        search: { redirect: '/markdown-twin/companies/acme/jobs/engineer.md' },
      });
    }, `${TWIN_URL}?ref=x`);

    await expect(served).rejects.toSatisfy(isRedirect);
    await expect(served).rejects.toMatchObject({
      options: {
        to: '/password',
        search: { redirect: '/companies/acme/jobs/engineer.md?ref=x' },
      },
    });
  });
});
