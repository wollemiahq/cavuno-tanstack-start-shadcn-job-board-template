'use client';

import { useRef, useState, type ReactNode } from 'react';

import { boardCopy } from '#/copy';
import { MENU_COLOR } from '#/starter-config';

import { Link, useRouter } from '@tanstack/react-router';
import {
  BookOpenText,
  BriefcaseBusiness,
  Building2,
  Menu,
  Search,
  Users,
  X,
} from 'lucide-react';

import { initialsOf } from '../lib/initials';
import { menuColorClasses } from '../lib/menu-color';
import { resolveSignupDestination } from '../lib/signup-destination';
import { m } from '../paraglide/messages';
import { signOut } from '../server/auth';

import {
  CompanySearchCombobox,
  type CompanyMarketSuggestionState,
} from '@/components/company-search-combobox';
import {
  KeywordCombobox,
  type KeywordSuggestionState,
} from '@/components/keyword-combobox';
import { Box } from '@/components/layout/box';
import {
  LocationCombobox,
  type LocationSuggestionState,
} from '@/components/location-combobox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button, buttonVariants } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import type {
  HeaderSearchState,
  HeaderSearchSubmission,
  HeaderSearchScope,
} from '@/lib/header-search';
import { hideBrokenImage } from '@/lib/hide-broken-image';
import { cn } from '@/lib/utils';
import type { BoardUser, CompanyMembership } from '@cavuno/board';
import type { BoardLabelOverrides } from '@cavuno/board/format';

const navItemClassName =
  'relative flex min-w-16 flex-col items-center justify-center gap-0.5 border-b-2 border-transparent px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50';
const mobileNavItemClassName =
  'flex items-center rounded-xl px-4 py-3 text-lg font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50';

function HeaderSearch({
  search,
  jobsPlaceholder,
  companiesPlaceholder,
  talentPlaceholder,
  blogPlaceholder,
}: {
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
}) {
  const [value, setValue] = useState(search.query);
  const [location, setLocation] = useState(search.location);
  const [term, setTerm] = useState(search.term);
  const [market, setMarket] = useState(search.market);
  const keywordInputRef = useRef<HTMLInputElement>(null);

  const scopePlaceholders: Record<HeaderSearchScope, string> = {
    jobs: jobsPlaceholder,
    companies: companiesPlaceholder,
    talent: talentPlaceholder,
    blog: blogPlaceholder,
  };

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = value.trim() || undefined;

    search.onSubmit({ scope: search.scope, query, location, term, market });
  }

  return (
    <form
      role="search"
      data-search-scope={search.scope}
      onSubmit={submitSearch}
      className="col-span-2 row-start-2 w-full min-w-0 py-2 xl:col-auto xl:row-auto xl:flex-1 xl:py-0"
    >
      <ButtonGroup
        aria-label={m.searchBar_searchAriaLabel()}
        className="w-full min-w-0"
      >
        {search.scope === 'jobs' ? (
          <KeywordCombobox
            {...search.keywordSuggestions}
            value={value}
            placeholder={scopePlaceholders.jobs}
            onValueChange={(nextValue) => {
              setValue(nextValue);
              setTerm(null);
            }}
            onSelect={(suggestion) => {
              setValue(suggestion.name);
              setTerm(suggestion);
            }}
            onClear={() => setTerm(null)}
          />
        ) : search.scope === 'companies' ? (
          <CompanySearchCombobox
            {...search.companyMarketSuggestions}
            value={value}
            placeholder={scopePlaceholders.companies}
            onValueChange={(nextValue) => {
              setValue(nextValue);
              setMarket(null);
            }}
            onSelect={(suggestion) => {
              setValue(suggestion.name);
              setMarket(suggestion);
              search.onSubmit({
                scope: 'companies',
                query: suggestion.name,
                location: null,
                term: null,
                market: suggestion,
              });
            }}
            onClear={() => setMarket(null)}
          />
        ) : (
          <InputGroup className="border-border bg-input/50 h-9 min-w-0 flex-1">
            <InputGroupInput
              ref={keywordInputRef}
              type="search"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              aria-label={m.searchBar_keywordAriaLabel()}
              placeholder={scopePlaceholders[search.scope]}
              className="min-w-0"
            />
            <InputGroupAddon>
              <Search aria-hidden="true" />
            </InputGroupAddon>
            {value ? (
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  type="button"
                  size="icon-xs"
                  aria-label={m.searchBar_clearAriaLabel()}
                  onClick={() => {
                    setValue('');
                    keywordInputRef.current?.focus();
                  }}
                  className="text-muted-foreground"
                >
                  <X aria-hidden="true" />
                </InputGroupButton>
              </InputGroupAddon>
            ) : null}
          </InputGroup>
        )}
        {search.scope === 'jobs' ? (
          <LocationCombobox
            {...search.locationSuggestions}
            value={location?.slug}
            valueLabel={location?.name}
            onSelect={setLocation}
            onClear={() => setLocation(null)}
            className="border-border bg-input/50 h-9 min-w-0 flex-1"
          />
        ) : null}
        <Button
          type="submit"
          variant="outline"
          size="icon-lg"
          aria-label={m.searchBar_searchAriaLabel()}
          className="size-9 shrink-0"
        >
          <Search aria-hidden="true" />
        </Button>
      </ButtonGroup>
    </form>
  );
}

/**
 * Signed-in identity menu — a Facebook-style avatar that opens the candidate's
 * account navigation and sign-out action. Sign-out mirrors `/account`:
 * end the session, invalidate the router cache, and return home.
 */
function AccountMenu({
  user,
  hasAccessGrant,
  nativeApplications,
  employerCompanies,
}: {
  user: BoardUser;
  /** true ⇒ the viewer holds an active access grant; shows "Subscription". */
  hasAccessGrant: boolean;
  /** false ⇒ the board is external-apply-only; hide the Applications entry. */
  nativeApplications: boolean;
  employerCompanies: CompanyMembership[] | null;
}) {
  const companyWorkspaces = (employerCompanies ?? []).filter(
    (membership) =>
      membership.status === 'approved' && membership.company.slug !== null,
  );
  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full"
            aria-label={m.siteHeader_accountLabel()}
            data-test="account-menu"
          />
        }
      >
        <Avatar size="sm">
          <AvatarFallback>
            {initialsOf(user.displayName ?? user.email)}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuItem nativeButton={false} render={<Link to="/account" />}>
          {m.accountShell_profileNav()}
        </DropdownMenuItem>
        <DropdownMenuItem
          nativeButton={false}
          render={<Link to="/account/saved" />}
        >
          {m.accountShell_savedJobsNav()}
        </DropdownMenuItem>
        <DropdownMenuItem
          nativeButton={false}
          render={<Link to="/me/alerts" />}
        >
          {m.accountShell_jobAlertsNav()}
        </DropdownMenuItem>
        {nativeApplications ? (
          <DropdownMenuItem
            nativeButton={false}
            render={<Link to="/me/applications" />}
          >
            {m.accountShell_applicationsNav()}
          </DropdownMenuItem>
        ) : null}
        {hasAccessGrant ? (
          <DropdownMenuItem
            nativeButton={false}
            render={<Link to="/account/access" />}
          >
            {m.accountShell_subscriptionNav()}
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem nativeButton={false} render={<Link to="/settings" />}>
          {m.accountShell_settingsNav()}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {/* Base UI requires GroupLabel inside a Group — an unwrapped label
            throws MenuGroupContext-missing and crashes to the boundary. */}
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            {m.employerOnboarding_yourCompaniesTitle()}
          </DropdownMenuLabel>
          {companyWorkspaces.map((membership) => (
            <DropdownMenuSub key={membership.id}>
              <DropdownMenuSubTrigger>
                {membership.company.name}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem
                  nativeButton={false}
                  render={
                    <Link
                      to="/employers/companies/$slug"
                      params={{ slug: membership.company.slug! }}
                    />
                  }
                >
                  {m.accountShell_jobsNav()}
                </DropdownMenuItem>
                <DropdownMenuItem
                  nativeButton={false}
                  render={
                    <Link
                      to="/employers/companies/$slug/profile"
                      params={{ slug: membership.company.slug! }}
                    />
                  }
                >
                  {m.accountShell_companyProfileNav()}
                </DropdownMenuItem>
                <DropdownMenuItem
                  nativeButton={false}
                  render={
                    <Link
                      to="/employers/companies/$slug/jobs/new"
                      params={{ slug: membership.company.slug! }}
                    />
                  }
                >
                  {m.siteHeader_postJobLabel()}
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          ))}
          <DropdownMenuItem
            nativeButton={false}
            render={<Link to="/employers/dashboard" search={{ add: true }} />}
          >
            {m.siteHeader_addNewCompanyLabel()}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          data-test="account-menu-sign-out"
          onClick={async () => {
            await signOut();
            await router.invalidate();
            await router.navigate({ to: '/' });
          }}
        >
          {m.accountHome_signOutLabel()}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function Header({
  boardName,
  logoUrl,
  user,
  language,
  labels,
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
  labels?: BoardLabelOverrides;
  features: {
    candidates: boolean;
    employers: boolean;
    publicJobSubmission: boolean;
    blog: boolean;
    talentDirectory: boolean;
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
  const copy = boardCopy(language, labels);
  const talentDirectoryEnabled =
    features.talentDirectory || talentDirectoryVisibility === 'employers_only';
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
  const signInLabel =
    labels?.jobCardLabels?.signInLabel || m.siteHeader_signInLabel();
  const signUpLabel =
    labels?.jobCardLabels?.signUpLabel || m.siteHeader_signUpLabel();
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
          key={`${search.scope}:${search.query}:${search.location?.slug ?? ''}:${search.term?.type ?? ''}:${search.term?.slug ?? ''}:${search.market?.slug ?? ''}`}
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
      <AccountMenu
        user={user}
        hasAccessGrant={hasAccessGrant}
        nativeApplications={features.nativeApplications}
        employerCompanies={employerCompanies}
      />
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
      <AccountMenu
        user={user}
        hasAccessGrant={hasAccessGrant}
        nativeApplications={features.nativeApplications}
        employerCompanies={employerCompanies}
      />
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
    <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
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
              <SheetTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-foreground xl:hidden"
                  />
                }
                aria-label={m.siteHeader_openNavMenuAriaLabel()}
              >
                <Menu aria-hidden="true" />
              </SheetTrigger>
            </div>
          </div>
        </Box>
      </header>

      <SheetContent
        side="top"
        showCloseButton={false}
        className="bg-background text-foreground inset-0 z-50 w-full gap-0 overflow-y-auto overscroll-contain rounded-none p-0 shadow-none data-[side=top]:inset-0 data-[side=top]:h-dvh data-[side=top]:max-w-none data-[side=top]:border-0 xl:hidden"
      >
        <SheetTitle className="sr-only">
          {m.siteHeader_primaryNavigationAriaLabel()}
        </SheetTitle>
        <Box paddingX={{ base: '4', md: '8' }}>
          <div className="grid min-h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3">
            {headerLeft}
            <div
              data-slot="header-actions"
              data-test="header-actions"
              className="col-start-2 row-start-1 flex shrink-0 items-center gap-2 justify-self-end"
            >
              {mobileAccountActions}
              <SheetClose
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-foreground"
                    aria-label={m.siteHeader_closeNavMenuAriaLabel()}
                  />
                }
              >
                <X aria-hidden="true" />
              </SheetClose>
            </div>
          </div>
        </Box>

        <nav
          aria-label={m.siteHeader_primaryNavigationAriaLabel()}
          className="border-border min-h-0 flex-1 overflow-y-auto border-t px-4 py-6"
        >
          {visibleNavLinks.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(mobileNavItemClassName, 'hover:no-underline')}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          {!user && features.publicJobSubmission ? (
            <Link
              to="/post"
              className={cn(mobileNavItemClassName, 'hover:no-underline')}
              onClick={() => setMenuOpen(false)}
            >
              {m.siteHeader_postJobLabel()}
            </Link>
          ) : null}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
