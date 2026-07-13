---
name: Account shell
purpose: The logged-in surface chassis — an identity rail, section nav, and content region.
primitives: [AccountShell, CandidateShell, EmployerCompanyShell]
usedBy: [src/components/account-shell.tsx, src/routes/account.tsx, src/routes/me.applications.tsx, src/routes/settings.tsx, src/routes/employers.dashboard.tsx, src/routes/employers.companies.$slug.index.tsx]
---

## Purpose

The logged-in surface (candidate account, employer dashboard, settings) wraps
its content in a shell: an identity rail (avatar + name + email), a section nav,
and the content region. `AccountShell`, `CandidateShell`, and
`EmployerCompanyShell` are the three chassis variants.

## When to use

- Any authenticated dashboard/account/settings page.
- **When NOT to use** — a public listing or detail page.

## Anatomy

- Identity block: avatar + name + email.
- A section nav (active item highlighted).
- The content region for the route's body.

## Composition

The shells live in `src/components/account-shell.tsx`. The whole logged-in
surface consumes them:

```tsx
<AccountShell>{/* route content */}</AccountShell>
```

## Do / Don't

| Do | Don't |
|---|---|
| Wrap authenticated pages in the matching shell variant. | Re-derive the identity rail + nav per route. |
| Migrate the shell to UUI tokens (`text-tertiary`, `bg-secondary`, `border-secondary`). | Leave the legacy tokens — `AccountShell` and the whole employer/candidate surface still use `text-foreground` / `bg-muted` / `text-muted-foreground` / `border-border`; this is the highest-volume drift axis, frozen by the [legacy-token ratchet](README.md). |

## Used by

- `account-shell.tsx` — the three shell variants.
- `account.*`, `me.*`, `settings`, `employers.dashboard`, `employers.companies.$slug.*`.

## Related

- [Form page](form-page.md)
- [Stat tile](stat-tile.md)
