import type { ReactNode } from 'react';

import { Link } from '@tanstack/react-router';

import { m } from '../paraglide/messages';

import { FacebookIcon, LinkedInIcon, XIcon } from '@/components/brand-icons';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Box } from '@/components/layout/box';
import { Container } from '@/components/layout/container';
import { Badge } from '@/components/ui/badge';
import { footerCopy } from '@/copy-groups/footer';
import { navCopy } from '@/copy-groups/nav';
import { hideBrokenImage } from '@/lib/hide-broken-image';
import { cn } from '@/lib/utils';
import type { BoardLabelOverrides } from '@cavuno/board/format';

/**
 * The board-context `footer` data group (hosted-footer parity slice) —
 * description, contact, website + social links, and the operator's nav
 * order/custom links. Not yet in the published SDK types, so the root
 * loader picks it off the wire body defensively; `null` against an API
 * that predates the slice (everything falls back to catalog defaults).
 */
export interface BoardContextFooter {
  description: string | null;
  contactEmail: string | null;
  websiteUrl: string | null;
  xUrl: string | null;
  facebookUrl: string | null;
  linkedinUrl: string | null;
  navigationOrder: string[];
  customLinks: Array<{ id: string; label: string; url: string }>;
}

interface FooterLink {
  href: string;
  label: string;
  external?: boolean;
}

/**
 * `{{board_name}}` / `{{year}}` placeholders in catalog templates
 * (`footer.copyrightPrefix`, `footer.defaultDescription`) and the
 * operator's custom footer description — same resolution the hosted
 * footer applies (`resolveProgrammaticTemplate` / `resolveCopyrightPrefix`).
 */
function resolveTemplate(template: string, boardName: string): string {
  return template
    .replaceAll('{{board_name}}', boardName)
    .replaceAll('{{year}}', new Date().getFullYear().toString());
}

/**
 * The operator-ordered "For Candidates" links — a port of the hosted
 * `buildBoardFooterNavigationLinks`: walk `navigationOrder` (system ids +
 * `custom:<id>` refs), then append any system item and custom link the
 * order missed. System items gate on their features.
 */
function buildNavigationLinks({
  order,
  customLinks,
  systemItems,
}: {
  order: string[];
  customLinks: BoardContextFooter['customLinks'];
  systemItems: Record<string, FooterLink | null>;
}): FooterLink[] {
  const customById = new Map(customLinks.map((link) => [link.id, link]));
  const links: FooterLink[] = [];
  const seen = new Set<string>();

  const add = (id: string, link: FooterLink | null | undefined) => {
    if (!link || seen.has(id)) return;
    links.push(link);
    seen.add(id);
  };

  for (const entry of order) {
    if (entry in systemItems) {
      add(entry, systemItems[entry]);
    } else if (entry.startsWith('custom:')) {
      const custom = customById.get(entry.slice('custom:'.length));
      if (custom) {
        add(entry, { href: custom.url, label: custom.label, external: true });
      }
    }
  }
  for (const [id, item] of Object.entries(systemItems)) add(id, item);
  for (const custom of customLinks) {
    add(`custom:${custom.id}`, {
      href: custom.url,
      label: custom.label,
      external: true,
    });
  }
  return links;
}

function FooterLinkItem({ link }: { link: FooterLink }) {
  return (
    <li>
      {link.external ? (
        <a
          href={link.href}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 rounded-sm text-sm transition-colors outline-none hover:no-underline focus-visible:ring-2"
        >
          {link.label}
        </a>
      ) : (
        <Link
          to={link.href}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 rounded-sm text-sm transition-colors outline-none hover:no-underline focus-visible:ring-2"
        >
          {link.label}
        </Link>
      )}
    </li>
  );
}

function FooterColumn({
  heading,
  links,
  children,
}: {
  heading: string;
  links: FooterLink[];
  children?: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-foreground text-sm font-semibold">{heading}</h2>
      <ul className="mt-4 space-y-3">
        {links.map((link) => (
          <FooterLinkItem key={`${link.href}${link.label}`} link={link} />
        ))}
      </ul>
      {children}
    </div>
  );
}

function CavunoMark() {
  return (
    <svg
      fill="none"
      viewBox="0 0 38 48"
      aria-hidden="true"
      className="size-3 shrink-0"
    >
      <circle cx="19" cy="24" r="16" stroke="currentColor" strokeWidth="6" />
    </svg>
  );
}

export default function Footer({
  boardName,
  logoUrl,
  language,
  labels,
  showCavunoBranding,
  primaryDomain,
  slug,
  features,
  footer,
  connected = false,
  talentDirectoryVisibility,
  hasEmployerOfferPage,
  flush = false,
  breadcrumb,
  cookiePreferencesAction,
}: {
  boardName: string;
  logoUrl: string | null;
  language: string;
  labels?: BoardLabelOverrides;
  /**
   * Board-context flag (`board.context().showCavunoBranding`, default
   * true). Plan-gated server-side: lower-tier plans cannot set it false.
   * Rendering it is a starter default, not an enforcement — a clone owner
   * can delete this; durable "Powered by Cavuno" attribution lives in the
   * server-controlled surfaces (emails, edge-injected on Cavuno-hosted
   * deploys), never in owned frontend code.
   */
  showCavunoBranding: boolean;
  primaryDomain: string | null;
  slug: string;
  features: {
    blog: boolean;
    talentDirectory: boolean;
    publicJobSubmission: boolean;
    impressum: boolean;
  };
  footer: BoardContextFooter | null;
  connected?: boolean;
  /**
   * The tri-state behind `features.talentDirectory` — hosted chrome links
   * /talent whenever it is not 'off' (an employers-only directory renders
   * a sign-in upsell). Null against an API that predates the field; fall
   * back to the collapsed boolean.
   */
  talentDirectoryVisibility: 'off' | 'public' | 'employers_only' | null;
  /**
   * Whether /employers has anything to sell (self-service, talent, or
   * sales-led plans) — the hosted `hasEmployerOfferPage` gate on the
   * Pricing links. `features.publicJobSubmission` is the hosted
   * `hasEnabledPlans` gate on "Post a job" (same public-plan query).
   */
  hasEmployerOfferPage: boolean;
  /** Remove the outer gap when the preceding route already fills a viewport. */
  flush?: boolean;
  /** Optional compact navigation trail rendered as the footer's first row. */
  breadcrumb?: ReactNode;
  /**
   * Optional action rendered among the legal links (the "Cookie
   * preferences" reopener on consent-required boards). A node, not a
   * callback, so the footer stays a dumb typed-props component.
   */
  cookiePreferencesAction?: ReactNode;
}) {
  const copy = {
    footer: footerCopy(language, labels),
    nav: navCopy(language, labels),
  };

  // ── For Candidates — operator-ordered system + custom links ──
  const navigationLinks = buildNavigationLinks({
    order: footer?.navigationOrder ?? [],
    customLinks: footer?.customLinks ?? [],
    systemItems: {
      home: { href: '/jobs', label: copy.nav.home },
      companies: { href: '/companies', label: copy.nav.companies },
      pricing: hasEmployerOfferPage
        ? { href: '/employers', label: copy.nav.pricing }
        : null,
      blog: features.blog ? { href: '/blog', label: copy.nav.blog } : null,
    },
  });

  // ── For Companies ──
  const talentLinked = talentDirectoryVisibility
    ? talentDirectoryVisibility !== 'off'
    : features.talentDirectory;
  const companyLinks: FooterLink[] = [
    ...(features.publicJobSubmission
      ? [{ href: '/post', label: copy.nav.post }]
      : []),
    ...(hasEmployerOfferPage
      ? [{ href: '/employers', label: copy.nav.pricing }]
      : []),
    ...(talentLinked ? [{ href: '/talent', label: copy.nav.talent }] : []),
  ];

  // ── Resources ──
  const resourceLinks: FooterLink[] = [
    { href: '/jobs/locations', label: copy.footer.locationsLabel },
    { href: '/salaries', label: copy.footer.salariesLabel },
    // sitemap.xml is a server route, not a router page → plain anchor
    { href: '/sitemap.xml', label: copy.footer.sitemapLabel, external: true },
  ];

  // ── About ──
  const aboutLinks: FooterLink[] = [
    { href: '/about', label: copy.footer.aboutLabel },
    ...(footer?.contactEmail
      ? [
          {
            href: `mailto:${footer.contactEmail}`,
            label: copy.footer.contactLabel,
            external: true,
          },
        ]
      : []),
    ...(footer?.websiteUrl
      ? [
          {
            href: footer.websiteUrl,
            label: copy.footer.websiteLabel,
            external: true,
          },
        ]
      : []),
  ];
  const socialLinks = [
    footer?.xUrl ? { href: footer.xUrl, label: 'X', icon: <XIcon /> } : null,
    footer?.facebookUrl
      ? { href: footer.facebookUrl, label: 'Facebook', icon: <FacebookIcon /> }
      : null,
    footer?.linkedinUrl
      ? { href: footer.linkedinUrl, label: 'LinkedIn', icon: <LinkedInIcon /> }
      : null,
  ].filter((link) => link !== null);

  const description = resolveTemplate(
    footer?.description || copy.footer.defaultDescription,
    boardName,
  );
  const copyright = `${resolveTemplate(copy.footer.copyrightPrefix, boardName)} ${copy.footer.allRightsReservedText}`;

  const legalLinks: FooterLink[] = [
    { href: '/terms-of-service', label: copy.footer.termsOfServiceLabel },
    { href: '/privacy-policy', label: copy.footer.privacyPolicyLabel },
    { href: '/cookie-policy', label: copy.footer.cookiePolicyLabel },
    ...(features.impressum
      ? [{ href: '/impressum', label: copy.footer.impressumLabel }]
      : []),
  ];

  const columns = [
    { heading: copy.footer.forCandidatesHeading, links: navigationLinks },
    ...(companyLinks.length > 0
      ? [{ heading: copy.footer.forCompaniesHeading, links: companyLinks }]
      : []),
    { heading: copy.footer.resourcesHeading, links: resourceLinks },
  ];

  // Hosted referral attribution: ?ref= the board's public host.
  const marketingHref = `https://cavuno.com/?ref=${encodeURIComponent(primaryDomain ?? slug)}`;

  return (
    <footer
      className={cn(
        'border-border bg-background text-foreground border-t',
        connected ? 'mt-0' : flush ? 'mt-16 md:mt-0' : 'mt-16',
      )}
    >
      <Container width="wide">
        {breadcrumb}
        <Box paddingY={{ base: '10', md: '12' }}>
          <div className="grid gap-10 md:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))]">
            <div className="max-w-xs space-y-4">
              <Link
                to="/"
                className="text-foreground focus-visible:ring-ring/50 flex items-center gap-2.5 rounded-md text-lg font-semibold outline-none hover:no-underline focus-visible:ring-2"
              >
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt=""
                    width={32}
                    height={32}
                    className="size-8 rounded-md"
                    onError={hideBrokenImage}
                  />
                ) : null}
                {boardName}
              </Link>
              <p className="text-muted-foreground text-sm">{description}</p>
              {showCavunoBranding ? (
                <a
                  href={marketingHref}
                  rel="noopener noreferrer"
                  target="_blank"
                  className="no-underline"
                >
                  {/* Matches the hosted board's attribution chip: a compact
                      outline Badge, muted "Powered by" + the mark + Cavuno. */}
                  <Badge variant="outline" className="gap-1.5">
                    <span className="text-muted-foreground font-normal">
                      {copy.footer.poweredByText}
                    </span>
                    <CavunoMark />
                    <span>{m.siteFooter_cavunoLabel()}</span>
                  </Badge>
                </a>
              ) : null}
            </div>

            {columns.map((column) => (
              <FooterColumn
                key={column.heading}
                heading={column.heading}
                links={column.links}
              />
            ))}

            <FooterColumn heading={copy.footer.aboutHeading} links={aboutLinks}>
              {socialLinks.length > 0 ? (
                <div className="mt-4 flex items-center gap-3">
                  {socialLinks.map((social) => (
                    <a
                      key={social.href}
                      href={social.href}
                      aria-label={social.label}
                      rel="noopener noreferrer"
                      target="_blank"
                      className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 flex size-10 items-center justify-center rounded-full transition-colors outline-none focus-visible:ring-2"
                    >
                      {social.icon}
                    </a>
                  ))}
                </div>
              ) : null}
            </FooterColumn>
          </div>

          <div className="border-border mt-12 flex flex-wrap items-center justify-between gap-x-6 gap-y-4 border-t pt-8">
            <span className="text-muted-foreground text-sm">{copyright}</span>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
              <nav className="flex flex-wrap gap-x-6 gap-y-3">
                {legalLinks.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 rounded-sm text-sm transition-colors outline-none hover:no-underline focus-visible:ring-2"
                  >
                    {link.label}
                  </Link>
                ))}
                {cookiePreferencesAction}
              </nav>
              <LanguageSwitcher />
            </div>
          </div>
        </Box>
      </Container>
    </footer>
  );
}
