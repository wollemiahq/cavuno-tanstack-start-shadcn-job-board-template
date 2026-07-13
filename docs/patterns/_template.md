---
name: Pattern name
purpose: One sentence — the job-seeker / operator goal this composition serves.
primitives: [PrimitiveA, PrimitiveB]
usedBy: [src/routes/example.tsx]
---

<!--
  Pattern-doc template. Every file in docs/patterns/ (except this one and
  README.md) copies this shape. The section order below is ENFORCED by
  src/pattern-contract.test.ts — the `## ` headings must appear in exactly
  this order, and the frontmatter must carry name / purpose / primitives /
  usedBy. `primitives` and `usedBy` are flow-style arrays ([a, b, c]).

  A pattern is a NAMED, documented page-or-section composition — the level
  above a single component. Document CURRENT reality: if a route still drifts
  from the pattern, record it in the Do / Don't table's "Don't" column rather
  than pretending the drift is gone.
-->

## Purpose

What this pattern is and the user goal it serves. One short paragraph.

## When to use

- When to reach for it.
- **When NOT to use** — the case that belongs to a sibling pattern instead.

## Anatomy

The primitives it composes, top to bottom. Link component names to their
entry in `DESIGN.md` where useful.

## Composition

The canonical code excerpt — the real component, not a toy. Show how the
primitives assemble.

## Do / Don't

| Do | Don't |
|---|---|
| The correct move. | The drift case (cite the offending file when it still exists). |

## Used by

The routes/components that own this pattern. This list mirrors the `usedBy`
frontmatter and is the contract a usage test can assert against.

## Related

Links to sibling patterns.
