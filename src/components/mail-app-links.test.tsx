// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { MailAppLinks, mailAppForEmail } from "./mail-app-links";

afterEach(cleanup);

describe("mailAppForEmail", () => {
  it("detects consumer Gmail and Outlook hosts", () => {
    expect(mailAppForEmail("ada@gmail.com")).toBe("gmail");
    expect(mailAppForEmail("ada@googlemail.com")).toBe("gmail");
    expect(mailAppForEmail("ada@outlook.com")).toBe("outlook");
    expect(mailAppForEmail("ada@hotmail.com")).toBe("outlook");
    expect(mailAppForEmail("ada@live.com")).toBe("outlook");
  });

  it("does not guess a mail app for unknown hosts", () => {
    expect(mailAppForEmail("ada@company.example")).toBeNull();
    expect(mailAppForEmail("not-an-email")).toBeNull();
  });
});

describe("MailAppLinks", () => {
  it("offers only Gmail for a Gmail address", () => {
    render(
      <MailAppLinks email="ada@gmail.com" gmailLabel="Open Gmail" outlookLabel="Open Outlook" />,
    );

    const gmail = screen.getByRole("link", { name: "Open Gmail" });
    expect(gmail).toHaveAttribute("href", "https://mail.google.com/");
    expect(gmail).toHaveAttribute("target", "_blank");
    expect(gmail).toHaveAttribute("rel", "noreferrer");
    expect(screen.queryByRole("link", { name: "Open Outlook" })).toBeNull();
  });

  it("offers only Outlook for an Outlook address", () => {
    render(
      <MailAppLinks email="ada@outlook.com" gmailLabel="Open Gmail" outlookLabel="Open Outlook" />,
    );

    expect(screen.getByRole("link", { name: "Open Outlook" })).toHaveAttribute(
      "href",
      "https://outlook.live.com/mail/",
    );
    expect(screen.queryByRole("link", { name: "Open Gmail" })).toBeNull();
  });

  it("renders nothing when the host is unknown", () => {
    const { container } = render(
      <MailAppLinks
        email="ada@company.example"
        gmailLabel="Open Gmail"
        outlookLabel="Open Outlook"
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("keeps the brand mark decorative so the label names the link", () => {
    const { container } = render(
      <MailAppLinks email="ada@gmail.com" gmailLabel="Open Gmail" outlookLabel="Open Outlook" />,
    );

    const marks = container.querySelectorAll("svg");
    expect(marks).toHaveLength(1);
    expect(marks[0]).toHaveAttribute("aria-hidden", "true");
  });
});
