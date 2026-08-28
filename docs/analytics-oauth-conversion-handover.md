# Handover: OAuth / magic-link conversion accuracy

**Audience:** Board API team  
**Frontend:** `cavuno-shadcn-ui-job-board-template` conversion tracking  
**Status:** Frontend works; measurement is intent-based until API exposes account outcome

---

## Problem

OAuth and magic-link completions fire `sign_up` or `login` based on **which auth page the user started from**, not whether the exchange actually created a new account.

A returning user who clicks “Continue with Google” on **sign-up** gets a `sign_up` conversion even when OAuth only logs them in. The inverse (new user starting from sign-in) is less common but the same class of inaccuracy.

Password auth does not have this gap. Login and sign-up are separate endpoints with explicit outcomes.

---

## Current frontend behavior

### Staging (before redirect to IdP)

Sign-up passes intent on `returnTo`:

```ts
candidateOAuthReturnTo(returnTo, 'sign_up', provider)
// → returnTo + cavuno_auth_intent=sign_up + cavuno_oauth_provider={provider}
```

Sign-in passes `'login'` instead.

Files: `src/routes/-auth.sign-up.tsx`, `src/routes/-auth.sign-in.tsx`, `src/lib/candidate-return-to.ts`.

### Resolution (after token exchange)

OAuth complete (`/auth/oauth-complete`) and magic-link consume (`/auth/magic-link`) redirect through:

```ts
resolvePostAuthConversionRedirect(returnTo, method)
```

That helper reads `cavuno_auth_intent` and maps:

- `sign_up` → append `cavuno_auth=sign_up`
- anything else → append `cavuno_auth=login`

Then `BoardAuthConversionTracker` fires the matching dataLayer / pixel event and strips the params.

Files: `src/lib/board-datalayer-events.ts`, `src/routes/-auth.oauth-complete.tsx`, `src/routes/-auth.magic-link.tsx`, `src/components/board-auth-conversion-tracker.tsx`.

### What the exchange returns today

```ts
// src/server/auth.ts — exchangeOAuth handler
return { ok: true, boardUser: session.boardUser };
```

No new-user vs returning-user signal is available to the frontend.

---

## Requested API change

Expose whether the auth exchange **created a new board user** vs **authenticated an existing one**.

### Suggested surface

Add a boolean (name negotiable) on OAuth exchange and magic-link consume responses, for example:

```ts
type AuthExchangeResult = {
  session: BoardSession; // existing shape
  boardUser: BoardUser;
  /** true when this exchange created the account; false when it logged into an existing account */
  isNewUser: boolean;
};
```

Apply to:

- `board.auth.exchangeOAuth({ token })`
- `board.auth.consumeMagicLink({ token })` (if magic-link can land new users)

### Semantics

| Scenario | `isNewUser` |
| --- | --- |
| First OAuth link for this email on this board | `true` |
| Returning OAuth login (account already exists) | `false` |
| Magic-link first consume for a new address | `true` |
| Magic-link consume for existing user | `false` |

The frontend will map `isNewUser: true` → `sign_up`, `false` → `login`, regardless of `cavuno_auth_intent`.

---

## Frontend follow-up (after API ships)

1. **Server handlers** (`src/server/auth.ts`): return `isNewUser` from exchange/consume.
2. **Completion loaders** (`-auth.oauth-complete.tsx`, `-auth.magic-link.tsx`): after successful exchange, append conversion params from `isNewUser` instead of (or overriding) staged intent:

   ```ts
   const event = result.isNewUser ? 'sign_up' : 'login';
   appendAuthConversionQuery(destination, event, method);
   ```

3. **Keep intent staging optional** for method/provider hints (`cavuno_oauth_provider`) but stop using `cavuno_auth_intent` as the source of truth for the event name.
4. **Tests:** OAuth completion redirect asserts server outcome, not page intent.
5. **SDK:** bump `@cavuno/board` once types include the new field.

`cavuno_auth_intent` can remain on `returnTo` for backwards compatibility during rollout, but should be ignored for event selection once `isNewUser` is available.

---

## Acceptance criteria

- Returning user via sign-up page OAuth → `login` event (not `sign_up`).
- New user via sign-in page OAuth (edge case) → `sign_up` event.
- Hosted-board parity on conversion field names unchanged (`event`, `method`, `board_slug`).
- Password flows unchanged.

---

## Out of scope (separate contract)

**Password `sign_up`** fires on verify-email **landing** (link with `cavuno_auth*`), not at form submit and not after OTP. That matches hosted boards and is documented in README. Not blocked on this API change.
