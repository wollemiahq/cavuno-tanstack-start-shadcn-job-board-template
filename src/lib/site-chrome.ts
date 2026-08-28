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
  | 'companyPlural'
  | 'candidateSingular'
  | 'candidatePlural'
  | 'candidatePresent';

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
  candidateSingular?: string;
  candidatePlural?: string;
  /** The "still ongoing" end of a date range on a candidate profile. */
  candidatePresent?: string;
};

/**
 * Operator overrides for the footer's own label catalog. Hosted stores these
 * as `footerLabels`; migration bakes the ones that differ from stock into
 * `chrome.json` so the clone keeps them after the dashboard stops being read
 * (ADR-0104 — applications own chrome copy).
 *
 * Values may contain `{{board_name}}` / `{{year}}` handlebars: `Footer.tsx`
 * resolves those via `resolveTemplate`, exactly as it does for the Paraglide
 * catalog's own templated strings. Do NOT rewrite them to Paraglide's `{x}`.
 */
export type ChromeFooterLabels = {
  aboutHeading?: string;
  aboutLabel?: string;
  allRightsReservedText?: string;
  contactLabel?: string;
  cookiePolicyLabel?: string;
  copyrightPrefix?: string;
  forCandidatesHeading?: string;
  forCompaniesHeading?: string;
  impressumLabel?: string;
  locationsLabel?: string;
  poweredByText?: string;
  privacyPolicyLabel?: string;
  resourcesHeading?: string;
  salariesLabel?: string;
  sitemapLabel?: string;
  termsOfServiceLabel?: string;
  websiteLabel?: string;
};

/**
 * Operator overrides for the cookie-consent banner. Hosted stores these as
 * `cookieBannerTitle` / `Description` / `AcceptLabel` / `RejectLabel` /
 * `ManageLabel`; the gate itself (`analytics.cookieConsentRequired`) stays on
 * the wire, only the wording is baked.
 */
export type ChromeCookieConsent = {
  title?: string;
  description?: string;
  acceptLabel?: string;
  denyLabel?: string;
  preferencesLabel?: string;
};

export type ChromeFooter = {
  description: string | null;
  navigationOrder: string[];
  customLinks: ChromeCustomLink[];
  labels: ChromeFooterLabels;
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
    candidateSingular?: string | null;
    candidatePlural?: string | null;
    candidatePresent?: string | null;
  };
  footer?: {
    description?: string | null;
    navigationOrder?: Array<string | null>;
    customLinks?: Array<{
      id?: string | null;
      label?: string | null;
      url?: string | null;
    } | null>;
    labels?: Partial<Record<ChromeFooterLabelKey, string | null>> | null;
  } | null;
  cookieConsent?: Partial<Record<ChromeCookieConsentKey, string | null>> | null;
  removedNavItems?: Array<string | null>;
};

export type ParsedChrome = {
  nav: ChromeNavOverrides;
  entity: ChromeEntityOverrides;
  footer: ChromeFooter;
  cookieConsent: ChromeCookieConsent;
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

/**
 * Footer label keys mirroring `footerCopy()` in `src/copy-groups/footer.ts`.
 * `defaultDescription` is deliberately absent — the operator's footer prose is
 * carried by `footer.description`, and having two paths to the same rendered
 * string is how one silently wins over the other.
 */
const FOOTER_LABEL_KEYS = [
  'aboutHeading',
  'aboutLabel',
  'allRightsReservedText',
  'contactLabel',
  'cookiePolicyLabel',
  'copyrightPrefix',
  'forCandidatesHeading',
  'forCompaniesHeading',
  'impressumLabel',
  'locationsLabel',
  'poweredByText',
  'privacyPolicyLabel',
  'resourcesHeading',
  'salariesLabel',
  'sitemapLabel',
  'termsOfServiceLabel',
  'websiteLabel',
] as const;

export type ChromeFooterLabelKey = (typeof FOOTER_LABEL_KEYS)[number];

/**
 * Cookie-banner keys mirroring the `cookieConsent_*` catalog messages.
 * `regionAriaLabel` is deliberately absent — it is not operator-configurable
 * hosted-side, so there is nothing to carry.
 */
const COOKIE_CONSENT_KEYS = [
  'title',
  'description',
  'acceptLabel',
  'denyLabel',
  'preferencesLabel',
] as const;

export type ChromeCookieConsentKey = (typeof COOKIE_CONSENT_KEYS)[number];

const ENTITY_KEYS = [
  'jobSingular',
  'jobPlural',
  'companySingular',
  'companyPlural',
  'candidateSingular',
  'candidatePlural',
  'candidatePresent',
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

function pickFooterLabels(
  value: NonNullable<ChromeFile['footer']>['labels'],
): ChromeFooterLabels {
  if (value == null) return {};
  const picked: ChromeFooterLabels = {};
  for (const key of FOOTER_LABEL_KEYS) {
    const text = trimmedText(value[key]);
    if (text) picked[key] = text;
  }
  return picked;
}

function pickCookieConsent(
  value: ChromeFile['cookieConsent'],
): ChromeCookieConsent {
  if (value == null) return {};
  const picked: ChromeCookieConsent = {};
  for (const key of COOKIE_CONSENT_KEYS) {
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
      labels: pickFooterLabels(footer?.labels),
    },
    cookieConsent: pickCookieConsent(file.cookieConsent),
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

export function chromeCookieConsent(): ChromeCookieConsent {
  return chrome.cookieConsent;
}

export function chromeRemovedNavItems(): string[] {
  return chrome.removedNavItems;
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
