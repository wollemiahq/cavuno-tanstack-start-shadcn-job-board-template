# OG text coverage

Job and blog images load the configured theme font plus Noto families for the
scripts present in the rendered text. These are font subsets fetched through
the existing Google Fonts loader, not added npm font packages. The board's
language chooses Japanese, simplified Chinese, or traditional Chinese Han
forms. Kana also selects Japanese when mixed into another board language.

Truncation and company initials use Unicode grapheme boundaries, preserving
combining accents, flags, skin tones, and joined emoji. Headline limits count
CJK characters and emoji as two width units to leave room for wrapping.
Takumi's emoji helper inserts Twemoji 17.0.2 image assets before rendering.

## Renderer and direction

Job and blog PNGs use `@takumi-rs/wasm` and `@takumi-rs/helpers`, pinned to
2.13.7. The Worker initializes the WASM module once and frees each per-request
renderer after use. Fonts and images are supplied explicitly.

The board language sets the overall layout direction. Each text field gets its
own paragraph direction from its first letter, keeping Latin salary labels and
URLs readable within RTL cards. HTML text and image attributes are escaped
before the HTML helper parses them.

Local Worker samples were visually checked for Arabic, Hebrew, mixed
Arabic/Latin, accented Latin, Japanese, simplified/traditional Chinese, Korean,
Devanagari, emoji, logos, and long titles. Arabic now renders connected letters
and Hebrew follows RTL reading order. These fixtures verify representative
samples, not every language or Unicode character. Font and remote-image
availability remain runtime dependencies; routes retain existing 503 handling.

## Deployment dependency review

The migration removes `workers-og` and introduces two pinned Takumi packages.
The separate builder deploy gate currently permits only catalog font packages
as new dependencies. Platform dependency review or a trusted template-baseline
rollout is required before shipping this through that builder. This repository
change does not modify the trusted gate or board grounding configuration.

## Reproduce the local render check

The harness uses synthetic fixtures and the production font loader, PNG renderer,
and job/blog compositions. It does not read or mutate board data. It is a script,
not a production route.

Create a temporary Wrangler config outside the app with this content, substituting
the absolute checkout path:

```json
{
  "name": "og-unicode-local-check",
  "main": "/absolute/checkout/scripts/og-unicode-smoke.worker.ts",
  "compatibility_date": "2025-09-02",
  "compatibility_flags": ["nodejs_compat"]
}
```

Run `pnpm exec wrangler dev --config /tmp/og-unicode-wrangler.jsonc --port 3011`
and open `http://localhost:3011/`. Follow each named sample link to inspect its
1200×630 PNG. Compare each image with the native browser reference text on the index; a
200 response alone is not a passing visual check.
