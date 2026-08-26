import { describe, expect, it } from 'vitest';

import {
  chromeEntity,
  chromeFooter,
  chromeNav,
  chromeRemovedNavItems,
  orderEnabledNavIds,
  readChrome,
  resolveFooterPresentation,
} from './site-chrome';

describe('stock src/chrome.json', () => {
  it('exposes empty overlays so catalog copy stays in place', () => {
    expect(chromeNav()).toEqual({});
    expect(chromeEntity()).toEqual({});
    expect(chromeFooter()).toEqual({
      description: null,
      navigationOrder: [],
      customLinks: [],
    });
    expect(chromeRemovedNavItems()).toEqual([]);
  });
});

describe('readChrome', () => {
  it('lets a provided nav/entity string win and ignores empty strings', () => {
    const parsed = readChrome({
      nav: {
        home: 'Roles',
        companies: '  ',
        blog: '',
        talent: 'People',
      },
      entity: {
        jobSingular: 'Role',
        jobPlural: '',
        companySingular: 'Studio',
        companyPlural: null,
      },
    });
    expect(parsed.nav).toEqual({ home: 'Roles', talent: 'People' });
    expect(parsed.entity).toEqual({
      jobSingular: 'Role',
      companySingular: 'Studio',
    });
    expect(parsed.nav.home ?? 'Jobs').toBe('Roles');
    expect(parsed.entity.jobSingular ?? 'Job').toBe('Role');
  });

  it('reads footer description, order, and complete custom links', () => {
    const parsed = readChrome({
      footer: {
        description: 'Hand-picked roles from {{board_name}}.',
        navigationOrder: ['home', '', 'custom:abc', 'companies'],
        customLinks: [
          {
            id: 'abc',
            label: 'Careers Hub',
            url: 'https://example.com/hub',
          },
          { id: 'skip', label: 'Missing url' },
          { id: '  ', label: 'Blank', url: 'https://example.com' },
        ],
      },
      removedNavItems: ['talent', '', 'blog'],
    });
    expect(parsed.footer.description).toBe(
      'Hand-picked roles from {{board_name}}.',
    );
    expect(parsed.footer.navigationOrder).toEqual([
      'home',
      'custom:abc',
      'companies',
    ]);
    expect(parsed.footer.customLinks).toEqual([
      { id: 'abc', label: 'Careers Hub', url: 'https://example.com/hub' },
    ]);
    expect(parsed.removedNavItems).toEqual(['talent', 'blog']);
  });
});

describe('resolveFooterPresentation', () => {
  it('prefers non-empty chrome description, order, and custom links', () => {
    const resolved = resolveFooterPresentation(
      {
        description: 'API description',
        navigationOrder: ['blog'],
        customLinks: [
          { id: 'api', label: 'API', url: 'https://example.com/api' },
        ],
      },
      {
        description: 'Chrome description',
        navigationOrder: ['home', 'custom:abc'],
        customLinks: [
          { id: 'abc', label: 'Careers Hub', url: 'https://example.com/hub' },
        ],
      },
    );
    expect(resolved.description).toBe('Chrome description');
    expect(resolved.navigationOrder).toEqual(['home', 'custom:abc']);
    expect(resolved.customLinks).toEqual([
      { id: 'abc', label: 'Careers Hub', url: 'https://example.com/hub' },
    ]);
  });

  it('falls back to the API footer when chrome is empty', () => {
    const resolved = resolveFooterPresentation(
      {
        description: 'API description',
        navigationOrder: ['blog'],
        customLinks: [
          { id: 'api', label: 'API', url: 'https://example.com/api' },
        ],
      },
      { description: null, navigationOrder: [], customLinks: [] },
    );
    expect(resolved.description).toBe('API description');
    expect(resolved.navigationOrder).toEqual(['blog']);
    expect(resolved.customLinks).toEqual([
      { id: 'api', label: 'API', url: 'https://example.com/api' },
    ]);
  });
});

describe('orderEnabledNavIds', () => {
  it('orders enabled ids to match navigationOrder and appends the rest', () => {
    expect(
      orderEnabledNavIds(
        ['home', 'companies', 'talent', 'blog'],
        ['blog', 'unknown', 'home'],
      ),
    ).toEqual(['blog', 'home', 'companies', 'talent']);
  });

  it('keeps the original enabled order when navigationOrder is empty', () => {
    expect(orderEnabledNavIds(['home', 'companies'], [])).toEqual([
      'home',
      'companies',
    ]);
  });
});
