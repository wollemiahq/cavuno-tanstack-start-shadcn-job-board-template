---
name: Account shell
purpose: The logged-in surface chassis — an identity rail, section nav, and content region.
primitives: [CandidateAccountShell, CandidateShell, AccountShell, EmployerCompanyShell, Page, PageContent]
usedBy: [src/components/board/candidate-account-shell.tsx, src/components/candidate-shell.tsx, src/components/account-shell.tsx, src/routes/account.tsx, src/routes/me.applications.tsx, src/routes/settings.tsx, src/routes/employers.dashboard.tsx, src/routes/employers.companies.$slug.index.tsx]
---

## Purpose

The logged-in surface wraps its content in a shell: an identity rail (avatar +
name + email), a section nav, and the content region. Candidate routes compose
`CandidateShell` with the shadcn-styled `CandidateAccountShell`; employer routes
retain their own `AccountShell` and `EmployerCompanyShell` chassis.

## When to use

- Any authenticated dashboard/account/settings page.
- **When NOT to use** — a public listing or detail page.

## Anatomy

- Identity block: avatar + name + email.
- A section nav (active item highlighted).
- The content region for the route's body.

## Composition

The candidate presentation adapter lives in `src/components/candidate-shell.tsx`;
routes feed it the root viewer and feature state through
`src/routes/-candidate-shell-context.ts`. Its layout primitive lives in
`src/components/board/candidate-account-shell.tsx` and uses the shared `Page` /
`PageContent` layout contract:

```tsx
const candidateShell = useCandidateShellContext()

<CandidateShell active="profile" {...candidateShell}>
  {/* route content */}
</CandidateShell>
```

## Do / Don't

| Do                                                                             | Don't                                                                          |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| Wrap authenticated pages in the matching shell variant.                        | Re-derive the identity rail + nav per route.                                   |
| Build candidate presentation from shadcn primitives and semantic theme tokens. | Import employer-shell or legacy presentation components into candidate routes. |
| Let `PageContent` own the left-aside/content geometry.                         | Add a second page-layout system inside account routes.                         |
| Pass loader-derived viewer and feature data from routes into the shell.        | Read route loaders from a component under `src/components/**`.                 |

## Used by

- `candidate-account-shell.tsx` — the candidate layout primitive.
- `candidate-shell.tsx` — the presentational candidate navigation/copy adapter.
- `-candidate-shell-context.ts` — the route-layer viewer/feature adapter.
- `account-shell.tsx` — the employer shell variants.
- `account.*`, `me.*`, `settings`, `employers.dashboard`, `employers.companies.$slug.*`.

## Related

- [Form page](form-page.md)
- [Stat tile](stat-tile.md)
