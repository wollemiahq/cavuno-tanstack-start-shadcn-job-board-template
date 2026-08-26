import chromeJson from '@/chrome.json';

export type ChromeNavKey =
  | 'home'
  | 'companies'
  | 'blog'
  | 'talent'
  | 'post'
  | 'pricing';

export type ChromeEntityKey =
  | 'jobSingular'
  | 'jobPlural'
  | 'companySingular'
  | 'companyPlural';

export type ChromeCustomLink = { id: string; label: string; url: string };

export type ChromeNavOverrides = {
  home?: string;
  companies?: string;
  blog?: string;
  talent?: string;
  post?: string;
  pricing?: string;
};

export type ChromeEntityOverrides = {
  jobSingular?: string;
  jobPlural?: string;
  companySingular?: string;
  companyPlural?: string;
};

export type ChromeFooter = {
  description: string | null;
  navigationOrder: string[];
  customLinks: ChromeCustomLink[];
};

/** Machine-managed `src/chrome.json` — only keys that are set are present. */
export type ChromeFile = {
  nav?: {
    home?: string | null;
    companies?: string | null;
    blog?: string | null;
    talent?: string | null;
    post?: string | null;
    pricing?: string | null;
  };
  entity?: {
    jobSingular?: string | null;
    jobPlural?: string | null;
    companySingular?: string | null;
    companyPlural?: string | null;
  };
  footer?: {
    description?: string | null;
    navigationOrder?: Array<string | null>;
    customLinks?: Array<{
      id?: string | null;
      label?: string | null;
      url?: string | null;
    } | null>;
  } | null;
  removedNavItems?: Array<string | null>;
};

export type ParsedChrome = {
  nav: ChromeNavOverrides;
  entity: ChromeEntityOverrides;
  footer: ChromeFooter;
  removedNavItems: string[];
};

const NAV_KEYS = [
  'home',
  'companies',
  'blog',
  'talent',
  'post',
  'pricing',
] as const satisfies ReadonlyArray<ChromeNavKey>;

const ENTITY_KEYS = [
  'jobSingular',
  'jobPlural',
  'companySingular',
  'companyPlural',
] as const satisfies ReadonlyArray<ChromeEntityKey>;

function trimmedText(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function stringList(value: Array<string | null> | undefined): string[] {
  if (value == null) return [];
  const items: string[] = [];
  for (const entry of value) {
    const text = trimmedText(entry);
    if (text) items.push(text);
  }
  return items;
}

function readCustomLinks(
  value:
    | NonNullable<NonNullable<ChromeFile['footer']>['customLinks']>
    | undefined,
): ChromeCustomLink[] {
  if (value == null) return [];
  const links: ChromeCustomLink[] = [];
  for (const entry of value) {
    if (entry == null) continue;
    const id = trimmedText(entry.id);
    const label = trimmedText(entry.label);
    const url = trimmedText(entry.url);
    if (id && label && url) links.push({ id, label, url });
  }
  return links;
}

function pickNav(value: ChromeFile['nav']): ChromeNavOverrides {
  if (value == null) return {};
  const picked: ChromeNavOverrides = {};
  for (const key of NAV_KEYS) {
    const text = trimmedText(value[key]);
    if (text) picked[key] = text;
  }
  return picked;
}

function pickEntity(value: ChromeFile['entity']): ChromeEntityOverrides {
  if (value == null) return {};
  const picked: ChromeEntityOverrides = {};
  for (const key of ENTITY_KEYS) {
    const text = trimmedText(value[key]);
    if (text) picked[key] = text;
  }
  return picked;
}

export function readChrome(file: ChromeFile): ParsedChrome {
  const footer = file.footer;
  return {
    nav: pickNav(file.nav),
    entity: pickEntity(file.entity),
    footer: {
      description: trimmedText(footer?.description),
      navigationOrder: stringList(footer?.navigationOrder),
      customLinks: readCustomLinks(footer?.customLinks),
    },
    removedNavItems: stringList(file.removedNavItems),
  };
}

// SAFETY: chrome.json is machine-managed (stock `{}`). Missing groups are
// treated as unset; extra keys are ignored.
const chrome = readChrome(chromeJson as ChromeFile);

export function chromeNav(): ChromeNavOverrides {
  return chrome.nav;
}

export function chromeEntity(): ChromeEntityOverrides {
  return chrome.entity;
}

export function chromeFooter(): ChromeFooter {
  return chrome.footer;
}

export function chromeRemovedNavItems(): string[] {
  return chrome.removedNavItems;
}

/** Chrome wins when it actually has a value; otherwise keep the API identity. */
export function resolveFooterPresentation(
  apiFooter: {
    description: string | null;
    navigationOrder: string[];
    customLinks: ChromeCustomLink[];
  } | null,
  overlay: ChromeFooter = chromeFooter(),
): ChromeFooter {
  return {
    description: overlay.description ?? apiFooter?.description ?? null,
    navigationOrder:
      overlay.navigationOrder.length > 0
        ? overlay.navigationOrder
        : (apiFooter?.navigationOrder ?? []),
    customLinks:
      overlay.customLinks.length > 0
        ? overlay.customLinks
        : (apiFooter?.customLinks ?? []),
  };
}

/**
 * Order enabled system ids to match `navigationOrder`. Unknown ids are
 * ignored; enabled items missing from the order still append.
 */
export function orderEnabledNavIds<T extends string>(
  enabledIds: readonly T[],
  navigationOrder: string[],
): T[] {
  if (navigationOrder.length === 0) return [...enabledIds];
  const enabled = new Set<string>(enabledIds);
  const seen = new Set<string>();
  const ordered: T[] = [];
  for (const id of navigationOrder) {
    const match = enabledIds.find((item) => item === id);
    if (!match || seen.has(match) || !enabled.has(match)) continue;
    ordered.push(match);
    seen.add(match);
  }
  for (const id of enabledIds) {
    if (!seen.has(id)) ordered.push(id);
  }
  return ordered;
}
