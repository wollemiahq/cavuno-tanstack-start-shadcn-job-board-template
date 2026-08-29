# Coding standards

`/code-review` reads this file on the Standards axis. Rules tooling already
enforces (lint, format, typecheck) stay out of this file.

## Tautological tests considered harmful

```
echo "Tautological tests considered harmful"
```

A test is tautological when its expected value restates the implementation, so
it passes by construction and can never disagree with the code.

Expected values come from an independent source of truth: a known-good literal,
a worked example, or the spec. Do not recompute the result the way the
production code does, assert a value equal to itself, or derive a snapshot by
running the same logic.

```ts
// Harmful: expected value is the implementation, replayed
test("calculateTotal sums line items", () => {
  const items = [{ price: 10 }, { price: 5 }];
  const expected = items.reduce((sum, i) => sum + i.price, 0);
  expect(calculateTotal(items)).toBe(expected);
});

// Required: independent, known result
test("calculateTotal sums line items", () => {
  expect(calculateTotal([{ price: 10 }, { price: 5 }])).toBe(15);
});
```

Same shape, same rejection:

- `expect(add(a, b)).toBe(a + b)`
- a fixture asserted equal to `JSON.parse(JSON.stringify(fixture))`
- a mock asserted to have been called with the arguments the test itself passed
- a snapshot produced by copying the function under test

If the assertion would still pass after the behaviour broke, the test is
tautological. Rewrite it or delete it.

SDK-formatted money, dates, and location strings are pinned **once**, in the
SDK goldens. Mapper and component tests do not replay those helpers and do
not re-pin the pretty string. They pin the wire (`salaryMin`, currency) and
whether a field is present. App-owned copy and limits with no SDK golden
(nav labels, `50` emails) pin the literal.
