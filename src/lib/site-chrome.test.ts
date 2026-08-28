import { describe, expect, it } from 'vitest';

import {
  chromeEntity,
  chromeFooter,
  chromeNav,
  chromeRemovedNavItems,
  orderEnabledNavIds,
  readChrome,
} from './site-chrome';

describe('stock src/chrome.json', () => {
  it('exposes empty overlays so catalog copy stays in place', () => {
    expect(chromeNav()).toEqual({});
    expect(chromeEntity()).toEqual({});
    expect(chromeFooter()).toEqual({
      description: null,
      navigationOrder: [],
      customLinks: [],
      labels: {},
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

describe('chrome presentation is git-only', () => {
  it('does not take description, order, or custom links from an API footer bag', () => {
    expect(chromeFooter()).toEqual({
      description: null,
      navigationOrder: [],
      customLinks: [],
      labels: {},
    });
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

describe('readChrome footer labels', () => {
  it('picks only known footer label keys and trims them', () => {
    // chrome.json is machine-managed and may carry keys this version does not
    // know (written by an older or newer emitter). Build the bag as a loose
    // record so the test can prove readChrome drops the unknown key instead of
    // passing it through.
    const labels = {
      aboutHeading: '  About us  ',
      poweredByText: 'Built by Acme',
      somethingElse: 'nope',
    };
    const parsed = readChrome({ footer: { labels } });
    expect(parsed.footer.labels).toEqual({
      aboutHeading: 'About us',
      poweredByText: 'Built by Acme',
    });
  });

  it('drops empty and null label values so the catalog still wins', () => {
    const parsed = readChrome({
      footer: { labels: { aboutHeading: '   ', contactLabel: null } },
    });
    expect(parsed.footer.labels).toEqual({});
  });

  it('keeps handlebars in a templated override — Footer resolves them', () => {
    // The hosted value is stored with `{{year}}` / `{{board_name}}`, and
    // Footer.tsx's resolveTemplate replaces exactly that syntax. Rewriting
    // these to Paraglide's `{x}` would render literal braces.
    const parsed = readChrome({
      footer: { labels: { copyrightPrefix: '© {{year}} {{board_name}} GmbH' } },
    });
    expect(parsed.footer.labels.copyrightPrefix).toBe(
      '© {{year}} {{board_name}} GmbH',
    );
  });

  it('absent footer group yields no labels', () => {
    expect(readChrome({}).footer.labels).toEqual({});
  });
});

describe('readChrome cookie consent', () => {
  it('picks the five operator-configurable banner strings', () => {
    const parsed = readChrome({
      cookieConsent: {
        title: 'Cookies on this board',
        description: '  We use them.  ',
        acceptLabel: 'Allow',
        denyLabel: 'No thanks',
        preferencesLabel: 'Manage cookies',
      },
    });
    expect(parsed.cookieConsent).toEqual({
      title: 'Cookies on this board',
      description: 'We use them.',
      acceptLabel: 'Allow',
      denyLabel: 'No thanks',
      preferencesLabel: 'Manage cookies',
    });
  });

  it('falls through to the catalog for blank or absent values', () => {
    expect(
      readChrome({ cookieConsent: { title: '  ' } }).cookieConsent,
    ).toEqual({});
    expect(readChrome({}).cookieConsent).toEqual({});
  });
});
