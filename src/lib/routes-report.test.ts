// @vitest-environment jsdom
/** Routes-report emitter unit tests (mapping, cap, and embed gate). */
import { describe, expect, it, vi } from 'vitest';

import {
  ROUTES_REPORT_CAP,
  ROUTES_REPORT_TYPE,
  emitRoutesReport,
  mapRouteTreeToPathTemplates,
} from './routes-report';

class TestWindow {
  parent: TestWindow;
  readonly postMessage = vi.fn();

  constructor() {
    this.parent = this;
  }
}

describe('mapRouteTreeToPathTemplates', () => {
  it('converts $param segments to :param form', () => {
    const tree = {
      id: '__root__',
      children: [
        {
          id: '/jobs',
          fullPath: '/jobs',
          children: [
            {
              id: '/jobs/$keyword',
              fullPath: '/jobs/$keyword',
            },
          ],
        },
        {
          id: '/companies/$companySlug/jobs/$jobSlug',
          fullPath: '/companies/$companySlug/jobs/$jobSlug',
        },
      ],
    };

    const templates = mapRouteTreeToPathTemplates(tree);
    expect(templates).toContain('/jobs');
    expect(templates).toContain('/jobs/:keyword');
    expect(templates).toContain('/companies/:companySlug/jobs/:jobSlug');
    expect(templates.some((t) => t.includes('$'))).toBe(false);
  });
});

describe('emitRoutesReport', () => {
  it('does not emit when not embedded (parent === self)', () => {
    const postMessage = vi.fn();
    const selfWin = new TestWindow();

    emitRoutesReport(
      { id: '__root__', children: [{ fullPath: '/jobs' }] },
      { selfWindow: selfWin, parent: selfWin },
    );

    expect(postMessage).not.toHaveBeenCalled();
  });

  it('posts the routes-report payload to the parent when embedded', () => {
    const postMessage = vi.fn();
    const parent = { postMessage };
    const selfWin = { parent };

    emitRoutesReport(
      {
        id: '__root__',
        children: [
          { fullPath: '/jobs' },
          { fullPath: '/alerts/manage' },
          { fullPath: '/companies/$companySlug/jobs/$jobSlug' },
        ],
      },
      { selfWindow: selfWin, parent },
    );

    expect(postMessage).toHaveBeenCalledTimes(1);
    const call = postMessage.mock.calls.at(0);
    if (!call) throw new Error('Expected a routes report postMessage call');
    const [payload, targetOrigin] = call;
    expect(targetOrigin).toBe('*');
    expect(payload).toEqual({
      type: ROUTES_REPORT_TYPE,
      routes: expect.arrayContaining([
        '/jobs',
        '/alerts/manage',
        '/companies/:companySlug/jobs/:jobSlug',
      ]),
    });
    expect(payload.type).toBe('cavuno-builder:routes-report');
  });

  it(`caps routes at ${ROUTES_REPORT_CAP}`, () => {
    const postMessage = vi.fn();
    const parent = { postMessage };
    const selfWin = { parent };

    const children = Array.from({ length: ROUTES_REPORT_CAP + 50 }, (_, i) => ({
      fullPath: `/r${i}`,
    }));

    emitRoutesReport(
      { id: '__root__', children },
      { selfWindow: selfWin, parent },
    );

    const [payload] = postMessage.mock.calls[0]!;
    expect(payload.routes).toHaveLength(ROUTES_REPORT_CAP);
  });

  it('never throws when postMessage fails', () => {
    const parent = {
      postMessage: () => {
        throw new Error('cross-origin blocked');
      },
    };
    expect(() =>
      emitRoutesReport(
        { id: '__root__', children: [{ fullPath: '/jobs' }] },
        { selfWindow: { parent }, parent },
      ),
    ).not.toThrow();
  });
});
