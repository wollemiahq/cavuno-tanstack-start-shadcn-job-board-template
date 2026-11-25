'use client';

import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { MENU_COLOR } from '#/starter-config';

import { Link, useParams, useRouterState } from '@tanstack/react-router';
import {
  BadgeCheck,
  BookOpenText,
  BriefcaseBusiness,
  Building2,
  Loader2,
  Menu,
  ShoppingBag,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';

import { resolveTalentDirectoryVisibility } from '../board/board-feature-flags';
import { menuColorClasses } from '../lib/menu-color';
import { resolveSignupDestination } from '../lib/signup-destination';
import { m } from '../paraglide/messages';

import type { SignOutAction } from './header-account-menu';
import type { CompanyMarketSuggestionState } from '@/components/company-search-combobox';
import { HeaderSearchEnhanced } from '@/components/header-search-enhanced';
import type { KeywordSuggestionState } from '@/components/keyword-combobox';
import { Box } from '@/components/layout/box';
import type { LocationSearchState } from '@/components/location-combobox';
import { Button, buttonVariants } from '@/components/ui/button';
import { jobSearchCopy } from '@/copy-groups/job-search';
import { navCopy } from '@/copy-groups/nav';
import { useLastEmployerCompany } from '@/hooks/use-last-employer-company';
import { employerPostDestination } from '@/lib/employer-post-destination';
import type {
  HeaderSearchLocation,
  HeaderSearchMarket,
  HeaderSearchState,
  HeaderSearchSubmission,
  HeaderSearchTerm,
} from '@/lib/header-search';
import {
  nameHeaderSearchLocation,
  reconcileHeaderSearchLocation,
} from '@/lib/header-search';
import { hideBrokenImage } from '@/lib/hide-broken-image';
import { membershipNavVisible } from '@/lib/membership-nav';
import {
  chromeFooter,
  chromeRemovedNavItems,
  orderEnabledNavIds,
} from '@/lib/site-chrome';
import { cn } from '@/lib/utils';
import type { BoardUser, CompanyMembership } from '@cavuno/board';
const navItemClassName =
  'relative flex min-w-16 flex-col items-center justify-center gap-0.5 border-b-2 border-transparent px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50';

/** A link in the header's primary navigation and the mobile menu. */
export interface HeaderNavItem {
  id: string;
  to: string;
  params?: Record<string, string>;
  label: string;
  icon: LucideIcon;
  /**
   * Set for the employer links, whose current page the header works out from
   * the route; `undefined` leaves it to the router's path matching.
   */
  current?: boolean;
}

/**
 * Which employer section the current page belongs to. Read from route ids,
 * which stay the same in every board language, unlike the localized pathname.
 */
function employerSectionOf(
  matches: ReadonlyArray<{ routeId: string }>,
): 'jobs' | 'company' | 'team' | 'talent' | null {
  const routeIds = matches.map((match) => match.routeId);
  if (routeIds.includes('/employers/companies/$slug/profile')) return 'company';
  if (routeIds.includes('/employers/companies/$slug/members')) return 'team';
  if (routeIds.some((id) => id.startsWith('/employers/companies/$slug'))) {
    return 'jobs';
  }
  if (routeIds.some((id) => id.startsWith('/talent'))) return 'talent';
  return null;
}

/**
 * The employer's links: their company's jobs, the candidate database when the
 * board has one, the company profile, the team, and Memberships when the board
 * sells them. The candidate and Memberships links keep the board's own labels
 * and follow the same rules as the public links.
 */
function employerNavItems(
  slug: string,
  section: ReturnType<typeof employerSectionOf>,
  publicLinks: ReadonlyMap<string, { label: string }>,
): HeaderNavItem[] {
  const params = { slug };
  const talent = publicLinks.get('talent');
  const memberships = publicLinks.get('memberships');
  return [
    {
      id: 'jobs',
      to: '/employers/companies/$slug',
      params,
      label: m.accountShell_jobsNav(),
      icon: BriefcaseBusiness,
      current: section === 'jobs',
    },
    ...(talent
      ? [
          {
            id: 'talent',
            to: '/talent',
            label: talent.label,
            icon: Users,
            current: section === 'talent',
          },
        ]
      : []),
    {
      id: 'company',
      to: '/employers/companies/$slug/profile',
      params,
      label: m.employerNav_companyLabel(),
      icon: Building2,
      current: section === 'company',
    },
    {
      id: 'team',
      to: '/employers/companies/$slug/members',
      params,
      label: m.employerNav_teamLabel(),
      icon: UserRound,
      current: section === 'team',
    },
    ...(memberships
      ? [
          {
            id: 'memberships',
            to: '/memberships',
            label: memberships.label,
            icon: BadgeCheck,
          },
        ]
      : []),
  ];
}

const LazyAccountMenu = lazy(() =>
  import('./header-account-menu').then(({ HeaderAccountMenu }) => ({
    default: HeaderAccountMenu,
  })),
);

const LazyMobileMenu = lazy(() =>
  import('./header-mobile-menu').then(({ HeaderMobileMenu }) => ({
    default: HeaderMobileMenu,
  })),
);

/** Shared, header-owned search field state — one copy even when the form
 * renders twice (page header + open mobile-nav sheet). */
export interface HeaderSearchFields {
  value: string;
  setValue: (value: string) => void;
  location: HeaderSearchLocation | null;
  setLocation: (location: HeaderSearchLocation | null) => void;
  term: HeaderSearchTerm | null;
  setTerm: (term: HeaderSearchTerm | null) => void;
  market: HeaderSearchMarket | null;
  setMarket: (market: HeaderSearchMarket | null) => void;
}

export interface HeaderSearchProps {
  search: HeaderSearchState & {
    onSubmit: (submission: HeaderSearchSubmission) => void;
    keywordSuggestions: KeywordSuggestionState;
    blogSuggestions: KeywordSuggestionState;
    companyMarketSuggestions: CompanyMarketSuggestionState;
    locationSuggestions: LocationSearchState;
  };
  fields: HeaderSearchFields;
  jobsPlaceholder: string;
  companiesPlaceholder: string;
  talentPlaceholder: string;
  blogPlaceholder: string;
  productsPlaceholder: string;
  helpPlaceholder: string;
}

function HeaderSearch(props: HeaderSearchProps) {
  return <HeaderSearchEnhanced {...props} />;
}

export default function Header({
  boardName,
  logoUrl,
  user,
  features,
  hasAccessGrant = false,
  employerCompanies = null,
  avatarUrl = null,
  onSignOut,
  signOutAction,
  talentDirectoryVisibility,
  hasMembershipPage = false,
  hasProductsPage = false,
  search,
  messagesNav,
  routeActionsRef,
  routeActionsFilled = false,
}: {
  boardName: string;
  logoUrl: string | null;
  user: BoardUser | null;
  language: string;
  features: {
    candidates: boolean;
    employers: boolean;
    publicJobSubmission: boolean;
    blog: boolean;
    talentDirectory: 'off' | 'public' | 'employers_only' | boolean;
    nativeApplications: boolean;
    jobRecommendationsEnabled?: boolean;
  };
  hasAccessGrant?: boolean;
  employerCompanies?: CompanyMembership[] | null;
  /** The viewer's profile photo, shown on the account button. */
  avatarUrl?: string | null;
  onSignOut: () => void;
  signOutAction?: SignOutAction;
  talentDirectoryVisibility: 'off' | 'public' | 'employers_only' | null;
  /** Whether the board publishes a membership plan (the Memberships link). */
  hasMembershipPage?: boolean;
  /** Whether the board lists a digital product (the Products link). */
  hasProductsPage?: boolean;
  messagesNav?: ReactNode;
  /**
   * Set when the route owns the header's actions
   * (`staticData.ownsHeaderActions`): from `lg` up the header renders a
   * slot the page fills (src/components/header-route-actions.tsx).
   */
  routeActionsRef?: (element: HTMLDivElement | null) => void;
  /**
   * The page has filled that slot: from `lg` up the sign-in, post-a-job and
   * sign-up links and the messages link give way to it; the account menu
   * stays after it. Phones keep the usual actions.
   */
  routeActionsFilled?: boolean;
  search: HeaderSearchState & {
    onSubmit: (submission: HeaderSearchSubmission) => void;
    keywordSuggestions: KeywordSuggestionState;
    blogSuggestions: KeywordSuggestionState;
    companyMarketSuggestions: CompanyMarketSuggestionState;
    locationSuggestions: LocationSearchState;
  };
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  // One copy of the search field state for BOTH renders of the form (the
  // page header and the open mobile-nav sheet share it, so opening the menu
  // never swaps the input for an empty twin).
  const [searchValue, setSearchValue] = useState(search.query);
  const [searchLocation, setSearchLocation] =
    useState<HeaderSearchLocation | null>(search.location);
  const [searchTerm, setSearchTerm] = useState<HeaderSearchTerm | null>(
    search.term,
  );
  const [searchMarket, setSearchMarket] = useState<HeaderSearchMarket | null>(
    search.market,
  );
  // Route changes used to remount the form via a key; with the state lifted
  // here, resync it when the URL-derived search identity changes instead
  // (React's adjust-state-during-render pattern).
  const searchKey = `${search.scope}:${search.query}:${
    search.location?.slug ?? ''
  }:${search.term?.type ?? ''}:${search.term?.slug ?? ''}:${
    search.market?.slug ?? ''
  }`;
  const [lastSearchKey, setLastSearchKey] = useState(searchKey);
  if (lastSearchKey !== searchKey) {
    setLastSearchKey(searchKey);
    setSearchValue(search.query);
    setSearchLocation((field) =>
      reconcileHeaderSearchLocation(field, search.location),
    );
    setSearchTerm(search.term);
    setSearchMarket(search.market);
  }
  // The route can name its place after the place itself is known (its loader
  // resolves the name); fill that name in without resyncing anything else.
  const routeLocationName = search.location?.name ?? '';
  const [lastRouteLocationName, setLastRouteLocationName] =
    useState(routeLocationName);
  if (lastRouteLocationName !== routeLocationName) {
    setLastRouteLocationName(routeLocationName);
    setSearchLocation((field) =>
      nameHeaderSearchLocation(field, search.location),
    );
  }
  const searchFields = {
    value: searchValue,
    setValue: setSearchValue,
    location: searchLocation,
    setLocation: setSearchLocation,
    term: searchTerm,
    setTerm: setSearchTerm,
    market: searchMarket,
    setMarket: setSearchMarket,
  };
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const employerSection = useRouterState({
    select: (state) => employerSectionOf(state.matches),
  });
  const routeParams = useParams({ strict: false });
  const copy = {
    jobSearch: jobSearchCopy(),
    nav: navCopy(),
  };
  const talentMode = resolveTalentDirectoryVisibility(
    talentDirectoryVisibility,
    features.talentDirectory,
  );
  // 'off' is a truthy string — compare explicitly, never coerce.
  const talentDirectoryEnabled = talentMode !== 'off';
  const removedNav = new Set(chromeRemovedNavItems());
  const navLinks = [
    {
      id: 'home',
      to: '/jobs',
      label: copy.nav.home,
      icon: BriefcaseBusiness,
      enabled: true,
    },
    {
      id: 'companies',
      to: '/companies',
      label: copy.nav.companies,
      icon: Building2,
      enabled: true,
    },
    {
      id: 'talent',
      to: '/talent',
      label: copy.nav.talent,
      icon: Users,
      enabled: talentDirectoryEnabled,
    },
    {
      id: 'blog',
      to: '/blog',
      label: copy.nav.blog,
      icon: BookOpenText,
      enabled: features.blog,
    },
    {
      id: 'memberships',
      to: '/memberships',
      label: copy.nav.memberships,
      icon: BadgeCheck,
      // Loader-driven, so the link never flashes in on a board that
      // publishes no membership plan (and /memberships 404s there).
      enabled: membershipNavVisible(hasMembershipPage, user?.role),
    },
    {
      id: 'products',
      to: '/products',
      label: copy.nav.products,
      icon: ShoppingBag,
      // Loader-driven like Memberships: no link on a board with no product.
      enabled: hasProductsPage,
    },
  ] as const;
  const enabledNavLinks = navLinks.filter(
    (item) => item.enabled && !removedNav.has(item.id),
  );
  const visibleNavIds = orderEnabledNavIds(
    enabledNavLinks.map((item) => item.id),
    chromeFooter().navigationOrder,
  );
  const navById = new Map(enabledNavLinks.map((item) => [item.id, item]));
  const visibleNavLinks = visibleNavIds.flatMap((id) => {
    const item = navById.get(id);
    return item ? [item] : [];
  });
  // An employer working on one company gets that company's links in place of
  // the public ones: the company in the URL, else the one they last opened in
  // this browser, else their only company. Someone with several companies who
  // has opened none yet keeps the public links and picks one from the account
  // menu.
  const routeCompanySlug =
    employerSection && employerSection !== 'talent'
      ? routeParams.slug
      : undefined;
  const companyWorkspaces = (employerCompanies ?? []).filter(
    (membership) =>
      membership.status === 'approved' && membership.company.slug !== null,
  );
  const [lastCompanySlug, rememberCompany] = useLastEmployerCompany();
  const routeCompany = companyWorkspaces.find(
    (membership) => membership.company.slug === routeCompanySlug,
  )?.company;
  const routeCompanyOpened = routeCompany?.slug ?? null;
  useEffect(() => {
    if (routeCompanyOpened) rememberCompany(routeCompanyOpened);
  }, [rememberCompany, routeCompanyOpened]);
  const activeCompany = user
    ? (routeCompany ??
      companyWorkspaces.find(
        (membership) => membership.company.slug === lastCompanySlug,
      )?.company ??
      (companyWorkspaces.length === 1 ? companyWorkspaces[0]?.company : null))
    : null;
  const navItems: HeaderNavItem[] = activeCompany?.slug
    ? employerNavItems(activeCompany.slug, employerSection, navById)
    : visibleNavLinks.map((item) => ({ ...item }));
  const postRemoved = removedNav.has('post');
  const signInLabel = m.siteHeader_signInLabel();
  const signUpLabel = m.siteHeader_signUpLabel();
  const authEnabled = features.candidates || features.employers;
  const signUpHref = resolveSignupDestination(features);
  const employerPost = employerPostDestination(user, employerCompanies);
  const postJobClassName = cn(
    buttonVariants({ variant: 'outline', size: 'sm' }),
    'hidden xl:inline-flex',
  );
  const postJob =
    features.publicJobSubmission && !postRemoved ? (
      employerPost.kind === 'company' ? (
        <Link
          to="/employers/companies/$slug/jobs/new"
          params={{ slug: employerPost.slug }}
          className={postJobClassName}
        >
          {copy.nav.post}
        </Link>
      ) : (
        <Link to="/post" className={postJobClassName}>
          {copy.nav.post}
        </Link>
      )
    ) : null;
  const headerLeft = (
    <div
      data-slot="header-left"
      data-test="header-left"
      className="contents xl:col-start-1 xl:row-start-1 xl:flex xl:min-w-0 xl:items-center xl:gap-3"
    >
      <Link
        to="/"
        className="text-foreground focus-visible:ring-ring/50 col-start-1 row-start-1 flex shrink-0 items-center gap-2.5 rounded-xl text-base font-semibold outline-none hover:no-underline focus-visible:ring-2"
      >
        {logoUrl ? (
          // Decorative when the board name is present (visually or as
          // sr-only). Empty alt keeps the link name from doubling.
          <img
            src={logoUrl}
            alt=""
            width={32}
            height={32}
            className="size-8 rounded-xl"
            onError={hideBrokenImage}
          />
        ) : null}
        {/*
          On narrow viewports with a logo + search, the wordmark is clipped
          for layout — use `sr-only` (not `hidden`) so the home link still
          has discernible text for screen readers / Lighthouse.
        */}
        <span
          className={cn(
            'max-w-48 truncate',
            search.visible &&
              logoUrl &&
              'sr-only sm:not-sr-only sm:inline xl:sr-only 2xl:not-sr-only 2xl:inline',
          )}
          title={boardName}
        >
          {boardName}
        </span>
      </Link>

      {search.visible ? (
        <HeaderSearch
          search={search}
          fields={searchFields}
          jobsPlaceholder={copy.jobSearch.keywordPlaceholder}
          companiesPlaceholder={m.companySearchBar_placeholderText()}
          talentPlaceholder={m.talentDirectory_searchPlaceholder()}
          blogPlaceholder={m.blogSearchBar_placeholderText()}
          productsPlaceholder={m.productSearchBar_placeholderText()}
          helpPlaceholder={m.help_searchPlaceholder()}
        />
      ) : null}
    </div>
  );
  // While the route fills the header's actions slot, these give way to it
  // from `lg` up.
  const belowLgOnRouteActions = (node: ReactNode) =>
    routeActionsFilled ? (
      <div className="contents lg:hidden">{node}</div>
    ) : (
      node
    );
  const accountActions = signingOut ? (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      disabled
      aria-label={m.accountHome_signOutLabel()}
    >
      <Loader2
        role="status"
        aria-label={m.ui_loadingLabel()}
        className="size-4 animate-spin"
      />
    </Button>
  ) : user ? (
    <>
      {belowLgOnRouteActions(messagesNav)}
      <Suspense fallback={null}>
        <LazyAccountMenu
          user={user}
          avatarUrl={avatarUrl}
          hasAccessGrant={hasAccessGrant}
          nativeApplications={features.nativeApplications}
          jobRecommendationsEnabled={features.jobRecommendationsEnabled ?? true}
          employerCompanies={employerCompanies}
          activeCompany={activeCompany}
          hasProductsPage={hasProductsPage}
          onSignOut={onSignOut}
          onSignOutPendingChange={setSigningOut}
          signOutAction={signOutAction}
        />
      </Suspense>
    </>
  ) : (
    belowLgOnRouteActions(
      <>
        {authEnabled ? (
          <Link
            to="/auth/sign-in"
            search={{ returnTo: '/account' }}
            className={buttonVariants({ variant: 'ghost', size: 'sm' })}
          >
            {signInLabel}
          </Link>
        ) : null}
        {postJob}
        {signUpHref ? (
          <Link to={signUpHref} className={buttonVariants({ size: 'sm' })}>
            {signUpLabel}
          </Link>
        ) : null}
      </>,
    )
  );

  return (
    <>
      <header
        data-menu-color={MENU_COLOR}
        className={cn(
          // Sticky keeps the real header (and its single search field) at the
          // top while the mobile nav panel is open, so the panel can pin with
          // CSS `top-16` (matches min-h-16) instead of getBoundingClientRect.
          'border-border text-foreground sticky top-0 z-50 border-b',
          ...menuColorClasses(MENU_COLOR),
        )}
      >
        <Box paddingX={{ base: '4', md: '8' }}>
          <div className="grid min-h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
            {headerLeft}

            <nav
              aria-label={m.siteHeader_primaryNavigationAriaLabel()}
              data-slot="header-primary-navigation"
              className="col-start-2 row-start-1 hidden shrink-0 items-stretch gap-0.5 self-stretch justify-self-center xl:flex"
            >
              {navItems.map((item) => (
                <Link
                  key={item.id}
                  to={item.to}
                  params={item.params}
                  className={cn(
                    navItemClassName,
                    'hover:no-underline',
                    item.current && 'border-primary text-foreground',
                  )}
                  aria-current={item.current ? 'page' : undefined}
                  {...(item.current === undefined
                    ? {
                        activeProps: {
                          className: cn(
                            navItemClassName,
                            'border-primary text-foreground hover:no-underline',
                          ),
                        },
                      }
                    : // The company's Jobs link is a prefix of its other
                      // pages; only an exact match may mark it current.
                      { activeOptions: { exact: true } })}
                >
                  <item.icon className="size-5" aria-hidden="true" />
                  {item.label}
                </Link>
              ))}
            </nav>

            <div
              data-slot="header-actions"
              data-test="header-actions"
              className="col-start-2 row-start-1 flex shrink-0 items-center gap-2 justify-self-end xl:col-start-3"
            >
              {routeActionsRef ? (
                <div
                  ref={routeActionsRef}
                  data-slot="header-route-actions"
                  className="hidden items-center gap-4 lg:flex lg:empty:hidden"
                />
              ) : null}
              {accountActions}
              <Button
                ref={menuButtonRef}
                type="button"
                variant="ghost"
                size="icon"
                className="text-foreground xl:hidden"
                aria-label={
                  menuOpen
                    ? m.siteHeader_closeNavMenuAriaLabel()
                    : m.siteHeader_openNavMenuAriaLabel()
                }
                aria-haspopup="dialog"
                aria-expanded={menuOpen}
                aria-controls="mobile-navigation-dialog"
                onClick={() => setMenuOpen((open) => !open)}
              >
                {menuOpen ? (
                  <X aria-hidden="true" />
                ) : (
                  <Menu aria-hidden="true" />
                )}
              </Button>
            </div>
          </div>
        </Box>
      </header>
      {menuOpen ? (
        <Suspense fallback={null}>
          <LazyMobileMenu
            navLinks={navItems}
            showPostJob={!user && features.publicJobSubmission && !postRemoved}
            navigationLabel={m.siteHeader_primaryNavigationAriaLabel()}
            postJobLabel={copy.nav.post}
            onOpenChange={(open) => {
              setMenuOpen(open);
              if (!open) {
                queueMicrotask(() => menuButtonRef.current?.focus());
              }
            }}
          />
        </Suspense>
      ) : null}
    </>
  );
}
