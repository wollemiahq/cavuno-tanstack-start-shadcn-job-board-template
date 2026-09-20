# Coding standards

/code-review reads this file on the Standards axis. Rules already enforced by
formatting, lint, or typecheck do not belong here.

Tests should protect behavior that users or downstream code rely on. Use
accessible roles and localized names to exercise interactions, then assert the
resulting state, navigation, data, permissions, or error. Exact copy is a
contract only when an external requirement fixes the wording; otherwise keep
tests independent of translations and presentation.

Expected values need an independent source of truth. Do not calculate an
expected result with the same logic as production or assert a value against
itself. SDK goldens own exact money, date, and location formatting. Mapper and
component tests pin raw wire values and field presence instead of repeating
those formatted strings.

Keep recurring UI in typed shared components and recurring visual decisions in
semantic theme tokens. Keep interface copy in Paraglide message keys, including
accessible names, with interpolation and plural handling intact. Tests may
protect a shared component's public behavior and accessibility, but should not
freeze incidental classes, JSX order, layout, or documentation prose.
