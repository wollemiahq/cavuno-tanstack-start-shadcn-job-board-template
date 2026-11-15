import { describe, expect, it, vi } from 'vitest';

import { breadcrumbsCopy } from '../copy-groups/breadcrumbs';
import { localizePath } from '../lib/localized-path';
import { llmsTxtBody, type LlmsTxtInput } from '../server/llms-txt';
import { Route } from './llms[.]txt';

const ORIGIN = 'https://board.example';

const fixture = vi.hoisted(() => ({
  context: vi.fn(),
}));
vi.mock('../lib/board', () => ({
  getPrimaryBoard: () => ({ context: fixture.context }),
}));
vi.mock('../lib/public-origin', () => ({
  readPrimaryPublicOrigin: async () => 'https://board.example',
}));

const input: LlmsTxtInput = {
  origin: ORIGIN,
  boardName: 'Robotics *Jobs*',
  description: 'Every robotics role\nin one place.',
  blogEnabled: true,
  aboutEnabled: true,
  mcpEnabled: true,
  legalPaths: ['/privacy-policy'],
};

function twin(path: string) {
  return `${ORIGIN}${localizePath(path)}.md`;
}

describe('llmsTxtBody', () => {
  it('names the board and links the twins of its main pages', () => {
    const labels = breadcrumbsCopy();
    expect(llmsTxtBody(input)).toBe(
      [
        '# Robotics \\*Jobs\\*',
        '',
        '> Every robotics role in one place.',
        '',
        `- [${labels.home}](${ORIGIN}/index.md)`,
        `- [${labels.jobs}](${twin('/jobs')})`,
        `- [${labels.companies}](${twin('/companies')})`,
        `- [${labels.salaries}](${twin('/salaries')})`,
        `- [${labels.blog}](${twin('/blog')})`,
        `- [${labels.about}](${twin('/about')})`,
        `- [${labels.pricing}](${twin('/pricing')})`,
        `- [MCP](${ORIGIN}/mcp/server-card)`,
        '',
        `- [${labels.privacyPolicy}](${twin('/privacy-policy')})`,
        '',
      ].join('\n'),
    );
  });

  it('leaves out what the board does not serve', () => {
    const body = llmsTxtBody({
      ...input,
      description: '',
      blogEnabled: false,
      aboutEnabled: false,
      mcpEnabled: false,
      legalPaths: [],
    });
    expect(body).not.toContain('>');
    expect(body).not.toContain(twin('/blog'));
    expect(body).not.toContain(twin('/about'));
    expect(body).not.toContain('/mcp/');
    expect(body).not.toContain(twin('/privacy-policy'));
  });
});

describe('/llms.txt route', () => {
  // SAFETY: the route defines GET and HEAD as functions of the request.
  const handlers = Route.options.server!.handlers as Record<
    'GET' | 'HEAD',
    (input: { request: Request }) => Promise<Response>
  >;

  it('serves the primary board as cacheable plain text', async () => {
    fixture.context.mockResolvedValue({
      name: 'Robotics Jobs',
      features: { blog: false, mcp: false },
    });
    const response = await handlers.GET({
      request: new Request(`${ORIGIN}/llms.txt`),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe(
      'text/plain; charset=utf-8',
    );
    expect(response.headers.get('cache-control')).toMatch(/^public, /);
    const body = await response.text();
    expect(body).toMatch(/^# Robotics Jobs\n\n> \S/);
    expect(body).toContain(`(${twin('/terms-of-service')})`);
    expect(body).toContain(`(${twin('/about')})`);
    expect(body).toContain(`(${twin('/pricing')})`);
    expect(body).not.toContain(twin('/blog'));
  });

  it('answers HEAD without a body', async () => {
    const response = await handlers.HEAD({
      request: new Request(`${ORIGIN}/llms.txt`, { method: 'HEAD' }),
    });
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('');
  });
});
