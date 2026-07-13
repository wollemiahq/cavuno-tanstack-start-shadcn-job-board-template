"use client";

import { useId, useState } from "react";

import { Link } from "@tanstack/react-router";
import { Menu, Search, X } from "lucide-react";

import type { BoardUser } from "@cavuno/board";
import type { BoardLabelOverrides } from "@cavuno/board/format";
import { boardCopy } from "#/copy";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Container } from "@/components/layout/container";
import {
  LocationCombobox,
  type LocationSuggestionState,
} from "@/components/location-combobox";
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
  "rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30";

function HeaderSearch({
  search,
  jobsLabel,
  companiesLabel,
  talentLabel,
  talentEnabled,
  jobsPlaceholder,
  companiesPlaceholder,
  talentPlaceholder,
}: {
  search: HeaderSearchState & {
    onSubmit: (submission: HeaderSearchSubmission) => void;
    locationSuggestions: LocationSuggestionState;
  };
  jobsLabel: string;
  companiesLabel: string;
  talentLabel: string;
  talentEnabled: boolean;
  jobsPlaceholder: string;
  companiesPlaceholder: string;
  talentPlaceholder: string;
}) {
  const [scope, setScope] = useState(search.scope);
  const [value, setValue] = useState(search.query);
  const [location, setLocation] = useState(search.location);

  const scopeLabels: Record<HeaderSearchScope, string> = {
    jobs: jobsLabel,
    companies: companiesLabel,
    talent: talentLabel,
  };
  const scopePlaceholders: Record<HeaderSearchScope, string> = {
    jobs: jobsPlaceholder,
    companies: companiesPlaceholder,
    talent: talentPlaceholder,
  };

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = value.trim() || undefined;

    search.onSubmit({ scope, query, location });
  }

  return (
    <form
      role="search"
      onSubmit={submitSearch}
      className="order-3 grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-t border-border py-2 md:order-none md:flex md:min-w-96 md:max-w-2xl md:flex-1 md:border-0 md:py-0"
    >
      <Select
        value={scope}
        onValueChange={(nextScope) => {
          setScope(nextScope as HeaderSearchScope);
          setValue("");
          setLocation(null);
        }}
      >
        <SelectTrigger
          aria-label={m.siteHeader_searchTypeAriaLabel()}
          className="shrink-0 border-border bg-background font-medium"
        >
          <SelectValue>{scopeLabels[scope]}</SelectValue>
        </SelectTrigger>
        <SelectContent align="start">
          <SelectItem value="jobs">{jobsLabel}</SelectItem>
          <SelectItem value="companies">{companiesLabel}</SelectItem>
          {talentEnabled ? <SelectItem value="talent">{talentLabel}</SelectItem> : null}
        </SelectContent>
      </Select>
      <Input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        aria-label={m.searchBar_keywordAriaLabel()}
        placeholder={scopePlaceholders[scope]}
        className="flex-1 border-border bg-background"
      />
      {scope === "jobs" ? (
        <LocationCombobox
          {...search.locationSuggestions}
          value={location?.slug}
          valueLabel={location?.name}
          onSelect={setLocation}
          onClear={() => setLocation(null)}
          className="col-span-2 col-start-2 row-start-2 min-w-0 md:col-auto md:row-auto md:min-w-40 md:flex-1"
        />
      ) : null}
      <Button
        type="submit"
        size="icon"
        aria-label={m.searchBar_searchAriaLabel()}
        className="col-start-3 row-start-1 md:col-auto md:row-auto"
      >
        <Search aria-hidden="true" />
      </Button>
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
    { to: "/jobs", label: copy.nav.home, enabled: true },
    { to: "/companies", label: copy.nav.companies, enabled: true },
    { to: "/talent", label: copy.nav.talent, enabled: talentDirectoryEnabled },
    { to: "/blog", label: copy.nav.blog, enabled: features.blog },
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
        <div className="flex min-h-16 flex-wrap items-center gap-3 md:flex-nowrap">
          <Link
            to="/"
            className="flex shrink-0 items-center gap-2.5 rounded-xl text-base font-semibold text-foreground outline-none hover:no-underline focus-visible:ring-3 focus-visible:ring-ring/30"
          >
            {logoUrl ? <img src={logoUrl} alt="" className="size-8 rounded-xl" /> : null}
            <span className="max-w-48 truncate" title={boardName}>
              {boardName}
            </span>
          </Link>

          <nav className="hidden shrink-0 items-center gap-0.5 xl:flex">
            {visibleNavLinks.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(navItemClassName, "hover:no-underline")}
                activeProps={{
                  className: cn(navItemClassName, "bg-muted text-foreground hover:no-underline"),
                }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {search.visible ? (
            <HeaderSearch
              key={`${search.scope}:${search.query}:${search.location?.slug ?? ""}`}
              search={search}
              jobsLabel={copy.nav.home}
              companiesLabel={copy.nav.companies}
              talentLabel={copy.nav.talent}
              talentEnabled={talentDirectoryEnabled}
              jobsPlaceholder={copy.jobSearch.keywordPlaceholder}
              companiesPlaceholder={m.companySearchBar_placeholderText()}
              talentPlaceholder={m.talentDirectory_searchPlaceholder()}
            />
          ) : null}

          <div className="ml-auto flex shrink-0 items-center gap-2">
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
