"use client";

import { useState } from "react";

import { Link } from "@tanstack/react-router";

import { Menu02, XClose } from "@untitledui/icons";

import type { BoardUser } from "@cavuno/board";
import type { BoardLabelOverrides } from "@cavuno/board/format";
import { boardCopy } from "#/copy";

import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { cx } from "@/utils/cx";
import { resolveSignupDestination } from "../lib/signup-destination";
import { m } from "../paraglide/messages";

import { MessagesNavLink } from "./messages-nav-link";

/** Nav item styled per the collection's app-navigation NavItemBase
 * (header variant): quiet secondary text, primary_hover wash, brand
 * focus outline. */
const navItemClassName =
  "rounded-md px-2 py-1 text-md font-semibold text-quaternary outline-focus-ring transition duration-100 ease-linear hover:bg-primary_hover hover:text-secondary_hover focus-visible:outline-2 focus-visible:outline-offset-2";

export default function Header({
  boardName,
  logoUrl,
  user,
  language,
  labels,
  features,
}: {
  boardName: string;
  logoUrl: string | null;
  user: BoardUser | null;
  language: string;
  labels?: BoardLabelOverrides;
  /**
   * The board's enabled account roles + public-posting flag. `candidates`/
   * `employers` drive the auth chrome: the hosted board hides Sign in/Sign up
   * entirely when both are off (registration would be refused server-side —
   * "Registration is not available for this role"), and the Sign up button
   * links to the exact form for a single-role board via
   * `resolveSignupDestination`. `publicJobSubmission` gates the "Post a job"
   * CTA, which is independent of auth (anonymous posting is allowed).
   */
  features: { candidates: boolean; employers: boolean; publicJobSubmission: boolean };
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const copy = boardCopy(language, labels);
  // Nav chrome from the catalog ⊕ operator overrides (ADR-0059). The
  // hosted nav has no "Locations" item — Locations rides the footer only.
  const navLinks = [
    { to: "/jobs", label: copy.nav.home },
    { to: "/companies", label: copy.nav.companies },
    { to: "/blog", label: copy.nav.blog },
  ] as const;
  // Auth chrome — stored as jobCardLabels.signInLabel/signUpLabel on the
  // hosted board; catalog keys land with the authed-surface slice.
  const signInLabel = labels?.jobCardLabels?.signInLabel || m.siteHeader_signInLabel();
  const signUpLabel = labels?.jobCardLabels?.signUpLabel || m.siteHeader_signUpLabel();
  // Auth entry points from the board's roles: whether to show sign-in/sign-up
  // at all, and where Sign up points (single-role boards skip the chooser hop).
  const authEnabled = features.candidates || features.employers;
  const signUpHref = resolveSignupDestination(features);
  // "Post a job" is gated on public submission only, not auth — anonymous
  // visitors may post when the board allows it.
  const postJob = features.publicJobSubmission ? (
    <Button color="secondary" size="md" href="/post">
      {m.siteHeader_postJobLabel()}
    </Button>
  ) : null;

  return (
    <header className="border-b border-secondary bg-primary">
      <div className="mx-auto flex h-18 max-w-container items-center gap-4 px-4 md:px-8">
        <Link
          to="/"
          className="flex items-center gap-2.5 rounded-md text-lg font-semibold text-primary outline-focus-ring hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {logoUrl ? <img src={logoUrl} alt="" className="size-8 rounded-md" /> : null}
          {boardName}
        </Link>

        <nav className="ml-4 hidden items-center gap-0.5 md:flex">
          {navLinks.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cx(navItemClassName, "hover:no-underline")}
              activeProps={{
                className: cx(navItemClassName, "text-secondary hover:no-underline"),
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {user ? (
            <>
              <MessagesNavLink />
              {postJob}
              <Button color="secondary" size="md" href="/account">
                {m.siteHeader_accountLabel()}
              </Button>
            </>
          ) : (
            <>
              {authEnabled ? (
                <Button
                  color="tertiary"
                  size="md"
                  href="/auth/sign-in"
                  className="hidden md:inline-flex"
                >
                  {signInLabel}
                </Button>
              ) : null}
              {postJob}
              {signUpHref ? (
                <Button color="primary" size="md" href={signUpHref}>
                  {signUpLabel}
                </Button>
              ) : null}
            </>
          )}
          <ButtonUtility
            size="sm"
            color="tertiary"
            icon={menuOpen ? XClose : Menu02}
            aria-label={m.siteHeader_openNavMenuAriaLabel()}
            onClick={() => setMenuOpen((open) => !open)}
            className="md:hidden"
          />
        </div>
      </div>

      {menuOpen ? (
        <nav className="flex flex-col gap-0.5 border-t border-secondary px-4 py-3 md:hidden">
          {navLinks.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cx(navItemClassName, "hover:no-underline")}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          {features.publicJobSubmission ? (
            <Link
              to="/post"
              className={cx(navItemClassName, "hover:no-underline")}
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
