# Preview states — testing your board on the sandbox

This board template, grounded on the **sandbox fixture tenant**
(`sandbox: true`), is the state-complete feature showcase. The developer
**preview toolbar** (bottom-left pill, visible only on the sandbox) switches
between seeded personas as **real sessions**, toggles whitelisted board
settings, and reseeds on demand.

Every state below is reachable by a human (toolbar click) or an agent
(the `src/server/preview.ts` server functions, invoked headlessly). Commands
and clicks are exact — copy them.

> Toolbar not showing? You are not on the sandbox board. Point
> `CAVUNO_BOARD` at the sandbox publishable key (below) in `.dev.vars`.

## Grounding

| Var | Value |
|---|---|
| `CAVUNO_BOARD` | `pk_c2f66367a3abaa6bafd00fd3c2de3297` — the sandbox fixture tenant’s published key (nightly reset) |
| `CAVUNO_API_URL` | `https://api.cavuno.com` |

The capability gate is board truth (`board.context().sandbox === true`),
never an env var — the toolbar can never render on a tenant board.

## Persona roster

The eight seeded personas. **Ids are stable; credentials are not hardcoded
here** — the switch seam is keyed by persona **id** and the server resolves
`id → email + password` from the live roster endpoint at switch time, so a
reseed that rotates the shared password needs no doc edit.

| Persona id | Role | States it unlocks |
|---|---|---|
| `candidate-new` | candidate | Empty profile / saved / applications / inbox |
| `candidate-unverified` | candidate | Verify-email apply gate, resend flow (sign-in does **not** gate on verification) |
| `candidate-complete` | candidate | Application tracker, saved jobs (incl. expired), authed alerts, populated talent profile |
| `candidate-premium` | candidate | Granted browsing (seeded fake grant); billing portal target — see recipe below |
| `employer-new` | employer | Connect-a-company empty dashboard |
| `employer-pending` | employer | Awaiting-approval dashboard (claim stuck `pending`) |
| `employer-member` | employer | Approved non-admin member (role-difference states) |
| `employer-admin` | employer | Workspace, jobs management, applicant pipeline (persona + guest applications), conversations |

### Switch as a persona

- **Human**: toolbar → pick the persona under Candidates / Employers.
- **Agent** (server function, headless): call `switchPersona({ data: { personaId: 'candidate-complete' } })`
  from `src/server/preview.ts`. It resolves credentials and stores the real
  session cookie. Returns `{ ok: false, code: 'persona-unavailable' }` if the
  roster was reseeded — reseed, then re-switch.
- **Exit** back to anonymous: toolbar → **Exit preview** (or `exitPreview()`).

### Enumerate the roster (browser-safe, no credentials)

`listPersonas()` → `PreviewPersona[]` (id / role / displayName / description /
states). Credentials never cross to the browser.

## Board settings (whitelisted feature flags)

Toolbar → **Board settings** → a control per key. Each change proxies
`PATCH /sandbox/config` and invalidates the router so loaders refetch. The
keys are the platform's **board-config vocabulary** (not the public
`features`-map names), so the payload matches the endpoint's whitelist
verbatim. The whitelist lives in one module (`src/lib/preview.ts`:
`SANDBOX_CONFIG_WHITELIST` for the accepted keys, `PREVIEW_FEATURE_FLAGS` for
the rendered controls) and is pinned against the platform source
(`convex/boards/sandboxPersonaManifest.ts`) by a unit test. Reserved keys
(`sandboxBoard`, `isTestBoard`, `passwordProtectionEnabled`) are not
toggleable.

| Config key | Control | Board-config state it exposes |
|---|---|---|
| `jobAccessPaywallEnabled` | switch | Candidate paywall on/off — anonymous `gatedCount` on job lists |
| `talentDirectoryVisibility` | tri-state select | `/talent` directory: `off` · `public` · `employers_only` |
| `blogEnabled` | switch | Blog surfaces on/off |
| `jobAlertsEnabled` | switch | Anonymous job-alert subscription on/off |
| `candidatesEnabled` | switch | Candidate profiles / sign-up on/off |
| `employersEnabled` | switch | Employer sign-up / self-serve on/off |
| `registrationWallEnabled` | switch | Require sign-in before jobs are visible |

`jobAccessPreviewCount` (number) is on the API whitelist but has no toolbar
control. `publicJobSubmission` is **not** a board-config key — there is no such
toggle. `talentDirectoryVisibility` is a tri-state (not a boolean): the select
value maps directly to the enum member.

Agent equivalent: `updateSandboxFlags({ data: { config: { jobAccessPaywallEnabled: true } } })`
(or `{ config: { talentDirectoryVisibility: 'employers_only' } }`).

The nightly reset and the reseed action restore the **baseline** config, so
toggles are exploration, not drift.

## Reseed

Toolbar → **Reseed** → confirm. Recreates the persona roster and restores the
baseline board config. Agent equivalent: `reseedSandbox()`.

**When to reseed:**
- A demo state got consumed — e.g. the unread-message badge dies the first
  time anyone opens that inbox. Reseed restores it.
- A persona credential was changed/hijacked, or you want fresh timestamps
  without waiting for the 23:30 UTC nightly reset.

**Reseed affordance on a stale switch:** if you switch to a persona that was
reseeded out from under an open menu, the switch returns
`persona-unavailable` and the toolbar shows an inline "reseeded — re-switch"
banner. Click **Reseed**, then pick the persona again.

## Emails (captured outbound mail)

Toolbar → **Emails** opens a letter_opener-style viewer over the sandbox's
captured outbound mail. The sandbox does not deliver email — it **captures**
every board message the send path produces and lists them newest-first;
expanding a row renders the captured HTML body (plain-text fallback when a
message has no HTML). This is what unblocks any flow whose next step normally
arrives in an inbox.

**What's captured:** all sandbox board email, regardless of persona —
transactional and scheduled alike.

**Flows it unlocks (read the link out of the body, then follow it):**

| Flow | Email to look for |
|---|---|
| Passwordless / magic-link sign-in | the sign-in link message |
| Email verification (the `candidate-unverified` apply gate) | the verify-address message |
| Anonymous job-alert **manage / unsubscribe** (the HMAC token that otherwise only arrives by email) | the alert-confirmation / manage message |
| Job-alert **double-opt-in** confirmation | the "confirm your alert" message |
| Password reset | the reset-password message |
| Digests (alert / activity digests) | the digest message |

The alert manage/unsubscribe HMAC URL in particular — previously only
reachable via the seed-time `alert-manage-url` capture (see the job-alert
recipe below) — is now readable live: trigger the alert, open **Emails**,
expand the confirmation, and copy the manage link.

**Refresh:** the panel loads on open; hit **Refresh** after triggering a new
email. Newest is at the top.

### Scriptable path (agents)

Headless, no toolbar: `listSandboxEmails({ data: { limit: 50 } })` from
`src/server/preview.ts` → `PreviewEmail[]`, newest-first. `limit` is clamped
server-side to `[1, 200]` (default 50). Sandbox-gated exactly like
`listPersonas` — returns `[]` off the sandbox, and the underlying
`GET …/sandbox/emails` endpoint 404s on a tenant board. Nothing is stripped:
`html` is the platform's own pre-sanitized send-path output, and the body is
where the magic / verification / manage links live.

Wire shape of each `PreviewEmail`:

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Stable capture id |
| `to` | `string` | Recipient address |
| `subject` | `string` | |
| `html` | `string` | Pre-sanitized platform body; rendered as-is |
| `text` | `string \| null` | Plain-text fallback; null when the capture is HTML-only |
| `type` | `string \| null` | Template tag (`magic_link`, `verification`, …); null when the capture has no `emailType` (the viewer hides the badge) |
| `createdAt` | `number` | Capture time as epoch milliseconds |

## Payments — magic test cards

The sandbox runs Stripe **test mode**. On any board checkout (candidate
paywall, job-posting funnel), use the standard magic cards. Any future expiry,
any CVC, any postal code.

| Card number | Outcome |
|---|---|
| `4242 4242 4242 4242` | Success |
| `4000 0000 0000 0002` | Decline (generic) |
| `4000 0000 0000 3155` | 3-D Secure authentication challenge |

Job-posting funnel: pick the plan whose outcome you want to reach — a **paid**
plan → `checkout`, a **free** plan → `published`. (Moderated / invoice
outcomes and the Elements checkout seam are out of scope for v0.)

## Transient-state recipes (self-service)

States no seed can freeze — reproduce them by hand.

### Mid-resume-parse

1. Switch to `candidate-complete` (verified).
2. Go to `/account`, upload a resume (large PDF).
3. The parse is async — the UI polls `getResume()`. The **parsing** state is
   the window before status flips to `parsed`/`failed`. To force **parse
   failure**, upload a zero-byte or non-document file.

### Webhook latency window (grant not yet landed)

1. Switch to any candidate. Toggle **Candidate paywall**
   (`jobAccessPaywallEnabled`) on.
2. Start the paywall checkout, pay with `4242…`.
3. The grant activates via webhook — there is a brief window where checkout
   succeeded but the grant has not landed and browsing is still gated. Reload
   quickly after paying to observe it.

### Checkout abandonment

1. Open any checkout (paywall or job-posting).
2. Close the embedded checkout / navigate away without paying.
3. Reload — no grant, no published job. This is the abandoned state.

### Real-subscription states (billing portal, renewal)

`candidate-premium` holds a **seeded (fake) grant** — good for granted
*browsing*. A real recurring subscription (billing portal, renewal) cannot be
seeded; mint one live:

1. Switch to `candidate-premium` (or any candidate).
2. Toggle **Candidate paywall** (`jobAccessPaywallEnabled`) on, open the **recurring** offer, check out with
   `4242 4242 4242 4242`.
3. The billing portal and renewal surfaces now resolve against that live
   test-mode subscription.

### Guest application

1. **Exit preview** (anonymous).
2. Open a **native-apply** job (`employer-admin`'s company has them).
3. Apply without signing in — supply an email + resume. This exercises the
   guest arm of the applicant pipeline (visible when signed in as
   `employer-admin`).

### Anonymous job-alert subscription (HMAC manage token)

The confirmed anonymous alert's **manage/unsubscribe URL** carries an HMAC
token that normally only arrives by email. The seeder **captures it into the
generated docs at seed time** — look for the `alert-manage-url` line the
seed output writes here (the orchestrator wires this). Without it the
manage/unsubscribe fixture is unreachable.

- Subscribe fresh: **Exit preview**, use the job-alert prompt on a listing
  page, then confirm via the double-opt-in link.

## Scriptable seam (agents)

All of the above is driven by `src/server/preview.ts` — no toolbar required:

| Function | Purpose |
|---|---|
| `getPreviewCapability()` | `{ canPreview, reason }` — may this context complete a switch |
| `listPersonas()` | Browser-safe roster (no credentials) |
| `listSandboxEmails({ data: { limit } })` | Captured outbound mail, newest-first (`limit` clamped 1–200, default 50) |
| `switchPersona({ data: { personaId } })` | Real session as a persona |
| `exitPreview()` | Sign out to anonymous |
| `updateSandboxFlags({ data: { config } })` | Toggle whitelisted board-config keys |
| `reseedSandbox()` | Recreate roster + baseline config |

All are sandbox-gated server-side and 404 / return `not-sandbox` off the
sandbox board.
