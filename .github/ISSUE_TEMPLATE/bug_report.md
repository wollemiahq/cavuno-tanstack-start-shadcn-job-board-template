---
name: Bug report
about: Something in the template is broken or behaves unexpectedly
title: "[Bug] "
labels: bug
assignees: ''
---

## What happened

A clear description of the bug.

## Expected behavior

What you expected instead.

## Steps to reproduce

1. …
2. …
3. …

## Board grounding

- [ ] Default **sandbox** board (`pk_c2f66367…`)
- [ ] My own board (`pk_…`)

If your own board, describe anything unusual about its content or config
(without pasting secrets).

## Environment

- OS:
- Node version (CI uses 24):
- pnpm version (repo pins 11):
- `@cavuno/board` version (from `package.json`):
- Browser (if a UI issue):

## Evidence

Screenshots, a captured error, console/network output, or the failing route.
For UI issues, prefer describing the interaction/route state over pixel diffs.

## Verify triad

- [ ] `pnpm run typecheck && pnpm test && pnpm run build` reproduces / is
      affected by this
