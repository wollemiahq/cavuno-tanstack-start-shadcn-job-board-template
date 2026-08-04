'use client';

import { lazy, Suspense, useRef, useState, type ReactNode } from 'react';

import { MENU_COLOR } from '#/starter-config';

import { Link } from '@tanstack/react-router';
import {
  BookOpenText,
  BriefcaseBusiness,
  Building2,
  Menu,
  Users,
} from 'lucide-react';

import { menuColorClasses } from '../lib/menu-color';
import { resolveSignupDestination } from '../lib/signup-destination';
import { m } from '../paraglide/messages';

import type { CompanyMarketSuggestionState } from '@/components/company-search-combobox';
import { HeaderSearchEnhanced } from '@/components/header-search-enhanced';
import type { KeywordSuggestionState } from '@/components/keyword-combobox';
import { Box } from '@/components/layout/box';
import type { LocationSuggestionState } from '@/components/location-combobox';
import { Button, buttonVariants } from '@/components/ui/button';
import { jobSearchCopy } from '@/copy-groups/job-search';
import { navCopy } from '@/copy-groups/nav';
import type {
  HeaderSearchState,
  HeaderSearchSubmission,
} from '@/lib/header-search';
import { hideBrokenImage } from '@/lib/hide-broken-image';
import { cn } from '@/lib/utils';
import type { BoardUser, CompanyMembership } from '@cavuno/board';
const navItemClassName =
  'relative flex min-w-16 flex-col items-center justify-center gap-0.5 border-b-2 border-transparent px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50';

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

export interface HeaderSearchProps {
  search: HeaderSearchState & {
    onSubmit: (submission: HeaderSearchSubmission) => void;
    keywordSuggestions: KeywordSuggestionState;
    companyMarketSuggestions: CompanyMarketSuggestionState;
    locationSuggestions: LocationSuggestionState;
  };
  jobsPlaceholder: string;
  companiesPlaceholder: string;
  talentPlaceholder: string;
  blogPlaceholder: string;
}

function HeaderSearch(props: HeaderSearchProps) {
  return <HeaderSearchEnhanced {...props} />;
}

export default function Header({
  boardName,
  logoUrl,
  user,
  language,
  features,
  hasAccessGrant = false,
  employerCompanies = null,
  talentDirectoryVisibility,
  search,
  messagesNav,
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
  };
  hasAccessGrant?: boolean;
  employerCompanies?: CompanyMembership[] | null;
  talentDirectoryVisibility: 'off' | 'public' | 'employers_only' | null;
  messagesNav?: ReactNode;
  search: HeaderSearchState & {
    onSubmit: (submission: HeaderSearchSubmission) => void;
    keywordSuggestions: KeywordSuggestionState;
    companyMarketSuggestions: CompanyMarketSuggestionState;
    locationSuggestions: LocationSuggestionState;
  };
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const copy = {
    jobSearch: jobSearchCopy(language),
    nav: navCopy(language),
  };
  const talentMode =
    talentDirectoryVisibility ??
    (typeof features.talentDirectory === 'string'
      ? features.talentDirectory
      : features.talentDirectory
        ? 'public'
        : 'off');
  // 'off' is a truthy string — compare explicitly, never coerce.
  const talentDirectoryEnabled = talentMode !== 'off';
  const navLinks = [
    {
      to: '/jobs',
      label: copy.nav.home,
      icon: BriefcaseBusiness,
      enabled: true,
    },
    {
      to: '/companies',
      label: copy.nav.companies,
      icon: Building2,
      enabled: true,
    },
    {
      to: '/talent',
      label: copy.nav.talent,
      icon: Users,
      enabled: talentDirectoryEnabled,
    },
    {
      to: '/blog',
      label: copy.nav.blog,
      icon: BookOpenText,
      enabled: features.blog,
    },
  ] as const;
  const visibleNavLinks = navLinks.filter((item) => item.enabled);
  const signInLabel = m.siteHeader_signInLabel();
  const signUpLabel = m.siteHeader_signUpLabel();
  const authEnabled = features.candidates || features.employers;
  const signUpHref = resolveSignupDestination(features);
  const postJob = features.publicJobSubmission ? (
    <Link
      to="/post"
      className={cn(
        buttonVariants({ variant: 'outline', size: 'sm' }),
        'hidden xl:inline-flex',
      )}
    >
      {m.siteHeader_postJobLabel()}
    </Link>
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
          <img
            src={logoUrl}
            alt=""
            width={32}
            height={32}
            className="size-8 rounded-xl"
            onError={hideBrokenImage}
          />
        ) : null}
        <span
          className={cn(
            'max-w-48 truncate',
            search.visible &&
              logoUrl &&
              'hidden sm:inline xl:hidden 2xl:inline',
          )}
          title={boardName}
        >
          {boardName}
        </span>
      </Link>

      {search.visible ? (
        <HeaderSearch
          key={`${search.scope}:${search.query}:${
            search.location?.slug ?? ''
          }:${search.term?.type ?? ''}:${search.term?.slug ?? ''}:${search.market?.slug ?? ''}`}
          search={search}
          jobsPlaceholder={copy.jobSearch.keywordPlaceholder}
          companiesPlaceholder={m.companySearchBar_placeholderText()}
          talentPlaceholder={m.talentDirectory_searchPlaceholder()}
          blogPlaceholder={m.blogSearchBar_placeholderText()}
        />
      ) : null}
    </div>
  );
  const accountActions = user ? (
    <>
      {messagesNav}
      <Suspense fallback={null}>
        <LazyAccountMenu
          user={user}
          hasAccessGrant={hasAccessGrant}
          nativeApplications={features.nativeApplications}
          employerCompanies={employerCompanies}
        />
      </Suspense>
    </>
  ) : (
    <>
      {authEnabled ? (
        <Link
          to="/auth/sign-in"
          search={{ returnTo: undefined }}
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
    </>
  );
  const mobileAccountActions = user ? (
    <>
      {messagesNav}
      <Suspense fallback={null}>
        <LazyAccountMenu
          user={user}
          hasAccessGrant={hasAccessGrant}
          nativeApplications={features.nativeApplications}
          employerCompanies={employerCompanies}
        />
      </Suspense>
    </>
  ) : (
    <>
      {authEnabled ? (
        <Link
          to="/auth/sign-in"
          search={{ returnTo: undefined }}
          className={buttonVariants({ variant: 'ghost', size: 'sm' })}
        >
          {signInLabel}
        </Link>
      ) : null}
      {signUpHref ? (
        <Link to={signUpHref} className={buttonVariants({ size: 'sm' })}>
          {signUpLabel}
        </Link>
      ) : null}
    </>
  );

  return (
    <>
      <header
        data-menu-color={MENU_COLOR}
        className={cn(
          'border-border text-foreground border-b',
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
              {visibleNavLinks.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(navItemClassName, 'hover:no-underline')}
                  activeProps={{
                    className: cn(
                      navItemClassName,
                      'border-primary text-foreground hover:no-underline',
                    ),
                  }}
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
              {accountActions}
              <Button
                ref={menuButtonRef}
                type="button"
                variant="ghost"
                size="icon"
                className="text-foreground xl:hidden"
                aria-label={m.siteHeader_openNavMenuAriaLabel()}
                aria-haspopup="dialog"
                aria-expanded={menuOpen}
                aria-controls="mobile-navigation-dialog"
                onClick={() => setMenuOpen(true)}
              >
                <Menu aria-hidden="true" />
              </Button>
            </div>
          </div>
        </Box>
      </header>
      {menuOpen ? (
        <Suspense fallback={null}>
          <LazyMobileMenu
            headerLeft={headerLeft}
            accountActions={mobileAccountActions}
            navLinks={visibleNavLinks}
            showPostJob={!user && features.publicJobSubmission}
            navigationLabel={m.siteHeader_primaryNavigationAriaLabel()}
            closeLabel={m.siteHeader_closeNavMenuAriaLabel()}
            postJobLabel={m.siteHeader_postJobLabel()}
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
