"use client";

import { useId, useState } from "react";

import { Link } from "@tanstack/react-router";
import { BookOpenText, BriefcaseBusiness, Building2, Menu, Search, Users, X } from "lucide-react";

import type { BoardUser } from "@cavuno/board";
import type { BoardLabelOverrides } from "@cavuno/board/format";
import { boardCopy } from "#/copy";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Container } from "@/components/layout/container";
import { LocationCombobox, type LocationSuggestionState } from "@/components/location-combobox";
import { cn } from "@/lib/utils";
import type {
  HeaderSearchState,
  HeaderSearchSubmission,
  HeaderSearchScope,
} from "@/lib/header-search";
import { resolveSignupDestination } from "../lib/signup-destination";
import { m } from "../paraglide/messages";

import { MessagesNavLink } from "./messages-nav-link";

const navItemClassName =
  "relative flex min-w-16 flex-col items-center gap-0.5 border-b-2 border-transparent px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:rounded-xl focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30";

function HeaderSearch({
  search,
  jobsPlaceholder,
  companiesPlaceholder,
  talentPlaceholder,
  blogPlaceholder,
}: {
  search: HeaderSearchState & {
    onSubmit: (submission: HeaderSearchSubmission) => void;
    locationSuggestions: LocationSuggestionState;
  };
  jobsPlaceholder: string;
  companiesPlaceholder: string;
  talentPlaceholder: string;
  blogPlaceholder: string;
}) {
  const [value, setValue] = useState(search.query);
  const [location, setLocation] = useState(search.location);

  const scopePlaceholders: Record<HeaderSearchScope, string> = {
    jobs: jobsPlaceholder,
    companies: companiesPlaceholder,
    talent: talentPlaceholder,
    blog: blogPlaceholder,
  };

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = value.trim() || undefined;

    search.onSubmit({ scope: search.scope, query, location });
  }

  return (
    <form
      role="search"
      data-search-scope={search.scope}
      onSubmit={submitSearch}
      className="col-span-2 row-start-2 w-full min-w-0 py-2 xl:col-auto xl:row-auto xl:max-w-xl xl:flex-1 xl:py-0"
    >
      <div className="flex min-w-0 items-center overflow-visible rounded-2xl border border-border bg-input/50 transition-[color,box-shadow] focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            aria-label={m.searchBar_keywordAriaLabel()}
            placeholder={scopePlaceholders[search.scope]}
            className="h-9 rounded-none border-0 bg-transparent pr-2 pl-8 focus-visible:ring-0"
          />
        </div>
        {search.scope === "jobs" ? (
          <LocationCombobox
            {...search.locationSuggestions}
            value={location?.slug}
            valueLabel={location?.name}
            onSelect={setLocation}
            onClear={() => setLocation(null)}
            className="min-w-0 flex-1 border-l border-border"
            inputClassName="h-9 rounded-none border-0 bg-transparent focus-visible:ring-0"
          />
        ) : null}
        <Button
          type="submit"
          variant="ghost"
          size="icon-sm"
          aria-label={m.searchBar_searchAriaLabel()}
          className="mr-1"
        >
          <Search aria-hidden="true" />
        </Button>
      </div>
    </form>
  );
}

export default function Header({
  boardName,
  logoUrl,
  user,
  language,
  labels,
  features,
  talentDirectoryVisibility,
  search,
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
  };
  talentDirectoryVisibility: "off" | "public" | "employers_only" | null;
  search: HeaderSearchState & {
    onSubmit: (submission: HeaderSearchSubmission) => void;
    locationSuggestions: LocationSuggestionState;
  };
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const mobileMenuId = useId();
  const copy = boardCopy(language, labels);
  const talentDirectoryEnabled =
    features.talentDirectory || talentDirectoryVisibility === "employers_only";
  const navLinks = [
    { to: "/jobs", label: copy.nav.home, icon: BriefcaseBusiness, enabled: true },
    { to: "/companies", label: copy.nav.companies, icon: Building2, enabled: true },
    { to: "/talent", label: copy.nav.talent, icon: Users, enabled: talentDirectoryEnabled },
    { to: "/blog", label: copy.nav.blog, icon: BookOpenText, enabled: features.blog },
  ] as const;
  const visibleNavLinks = navLinks.filter((item) => item.enabled);
  const signInLabel = labels?.jobCardLabels?.signInLabel || m.siteHeader_signInLabel();
  const signUpLabel = labels?.jobCardLabels?.signUpLabel || m.siteHeader_signUpLabel();
  const authEnabled = features.candidates || features.employers;
  const signUpHref = resolveSignupDestination(features);
  const postJob = features.publicJobSubmission ? (
    <Link
      to="/post"
      className={cn(
        buttonVariants({ variant: "outline", size: "default" }),
        "hidden xl:inline-flex",
      )}
    >
      {m.siteHeader_postJobLabel()}
    </Link>
  ) : null;

  return (
    <header className="rhea-theme border-b border-border bg-background text-foreground">
      <Container width="wide">
        <div className="grid min-h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <div
            data-slot="header-left"
            data-test="header-left"
            className="contents xl:col-start-1 xl:row-start-1 xl:flex xl:min-w-0 xl:items-center xl:gap-3"
          >
            <Link
              to="/"
              className="col-start-1 row-start-1 flex shrink-0 items-center gap-2.5 rounded-xl text-base font-semibold text-foreground outline-none hover:no-underline focus-visible:ring-3 focus-visible:ring-ring/30"
            >
              {logoUrl ? <img src={logoUrl} alt="" className="size-8 rounded-xl" /> : null}
              <span
                className={cn(
                  "max-w-48 truncate",
                  search.visible && logoUrl && "hidden sm:inline xl:hidden 2xl:inline",
                )}
                title={boardName}
              >
                {boardName}
              </span>
            </Link>

            {search.visible ? (
              <HeaderSearch
                key={`${search.scope}:${search.query}:${search.location?.slug ?? ""}`}
                search={search}
                jobsPlaceholder={copy.jobSearch.keywordPlaceholder}
                companiesPlaceholder={m.companySearchBar_placeholderText()}
                talentPlaceholder={m.talentDirectory_searchPlaceholder()}
                blogPlaceholder={m.blogSearchBar_placeholderText()}
              />
            ) : null}
          </div>

          <nav
            aria-label={m.siteHeader_primaryNavigationAriaLabel()}
            data-slot="header-primary-navigation"
            className="col-start-2 row-start-1 hidden shrink-0 items-stretch justify-self-center gap-0.5 self-stretch xl:flex"
          >
            {visibleNavLinks.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(navItemClassName, "hover:no-underline")}
                activeProps={{
                  className: cn(
                    navItemClassName,
                    "border-primary text-foreground hover:no-underline",
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
            className="col-start-2 row-start-1 flex shrink-0 items-center justify-self-end gap-2 xl:col-start-3"
          >
            {user ? (
              <>
                <MessagesNavLink />
                {postJob}
                <Link to="/account" className={buttonVariants({ variant: "outline" })}>
                  {m.siteHeader_accountLabel()}
                </Link>
              </>
            ) : (
              <>
                {authEnabled ? (
                  <Link
                    to="/auth/sign-in"
                    search={{ returnTo: undefined }}
                    className={cn(buttonVariants({ variant: "ghost" }), "hidden md:inline-flex")}
                  >
                    {signInLabel}
                  </Link>
                ) : null}
                {postJob}
                {signUpHref ? (
                  <Link to={signUpHref} className={buttonVariants()}>
                    {signUpLabel}
                  </Link>
                ) : null}
              </>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={
                menuOpen
                  ? m.siteHeader_closeNavMenuAriaLabel()
                  : m.siteHeader_openNavMenuAriaLabel()
              }
              aria-expanded={menuOpen}
              aria-controls={mobileMenuId}
              onClick={() => setMenuOpen((open) => !open)}
              className="xl:hidden"
            >
              {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
            </Button>
          </div>
        </div>
      </Container>

      {menuOpen ? (
        <nav
          id={mobileMenuId}
          className="flex flex-col gap-0.5 border-t border-border px-4 py-3 xl:hidden"
        >
          {visibleNavLinks.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(navItemClassName, "hover:no-underline")}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          {features.publicJobSubmission ? (
            <Link
              to="/post"
              className={cn(navItemClassName, "hover:no-underline")}
              onClick={() => setMenuOpen(false)}
            >
              {m.siteHeader_postJobLabel()}
            </Link>
          ) : null}
        </nav>
      ) : null}
    </header>
  );
}
