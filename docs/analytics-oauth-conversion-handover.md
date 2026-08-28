# Handover: OAuth / magic-link conversion accuracy

**Audience:** Board API team / starter maintainers  
**Frontend:** `cavuno-shadcn-ui-job-board-template` conversion tracking  
**Status:** **API shipped** (Cavuno `7a532311c`). **Starter wired** on main — uses `isNewUser` from exchange/consume.

---

## Problem (resolved)

OAuth and magic-link completions previously fired `sign_up` or `login` based on **which auth page the user started from**, not whether the exchange actually created a new account.

---

## API contract (shipped)

`BoardAuthSession` includes optional `isNewUser?: boolean` on:

- `POST /boards/{identifier}/auth/oauth/exchange`
- `POST /boards/{identifier}/auth/magic-link/consume`

Login, register, refresh, and other auth routes omit the field.

```ts
{
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  boardUser: BoardUser;
  isNewUser?: boolean; // exchange + magic-link consume only
}
```

| Scenario | `isNewUser` |
| --- | --- |
| First OAuth link for this email on this board | `true` |
| Subscriber promoted to full account via OAuth | `true` |
| Returning OAuth login | `false` |
| Magic-link consume creates a new candidate | `true` |
| Magic-link consume for existing user | `false` |
| Subscriber promoted via magic link | `true` |

Map `isNewUser: true` → `sign_up`, `false` → `login`.

---

## Starter implementation

### Server (`src/server/auth.ts`)

`exchangeOAuth` and `consumeMagicLink` pass through `isNewUser: session.isNewUser === true`.

### Completion loaders

`-auth.oauth-complete.tsx` and `-auth.magic-link.tsx` call:

```ts
resolvePostAuthConversionRedirect(deps.returnTo, {
  isNewUser: result.isNewUser,
  fallbackMethod: 'google' | 'magic_link',
});
```

`resolvePostAuthConversionRedirect` strips staged `cavuno_auth_intent` and `cavuno_oauth_provider` from `returnTo`, picks method from provider hint, and appends `cavuno_auth*` from **server outcome only**.

Page intent (`cavuno_auth_intent`) remains on `returnTo` for rollout compatibility but is **not** used for event selection.

### SDK

Starter uses `@cavuno/board@4.11.0+` with typed `BoardAuthSession.isNewUser`. Exchange/consume handlers read `session.isNewUser === true` directly.

---

## Acceptance criteria

- Returning user via sign-up OAuth → `login` event (not `sign_up`).
- New user via sign-in OAuth (edge case) → `sign_up` event.
- Conversion payload unchanged (`event`, `method`, `board_slug`).
- Password flows unchanged (verify-email landing with `cavuno_auth*`).

---

## Out of scope

**Password `sign_up`** fires on verify-email **landing** (auto-redirect after registration with `cavuno_auth*`), not at form submit and not after OTP. Matches hosted boards.

**Reference:** Cavuno commit `7a532311c` on main.
