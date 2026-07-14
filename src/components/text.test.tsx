// @vitest-environment jsdom
/**
 * Text typography primitive (CAV-513). These lock the primitive's CONTRACT,
 * not incidental markup:
 *
 *  - The role-named variants map to exactly the shadcn typeset step the design
 *    system assigns them (display → 4xl/5xl, heading1 → 3xl, … ,
 *    body → base). heading1-4 are aligned with the owned Typeset stylesheet
 *    h1-h4 so <Text> and <Prose> render identically. Off-scale sizing is
 *    unexpressible: there is no `text-2xl` heading variant.
 *  - `as` (the rendered element) is decoupled from `variant` (the visual
 *    role): a display/heading variant REQUIRES `as` at the type level so the
 *    outline/a11y decision is forced; body-family defaults to <p>.
 *  - `size` and `bold` tune ONLY body-family; the type system forbids them on
 *    headings, whose sizes are locked correct-by-construction.
 *  - Each variant carries its own default color; `className` is an escape
 *    hatch merged through `cn` (so an override wins).
 */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { Text } from './text';

afterEach(cleanup);

describe('Text — role-named variant → shadcn typeset mapping', () => {
  it('maps each heading variant to its locked typeset size + semibold + foreground color', () => {
    const cases = [
      { variant: 'display', as: 'h1', size: 'text-4xl' },
      { variant: 'heading1', as: 'h1', size: 'text-3xl' },
      { variant: 'heading2', as: 'h2', size: 'text-2xl' },
      { variant: 'heading3', as: 'h3', size: 'text-xl' },
      { variant: 'heading4', as: 'h4', size: 'text-lg' },
    ] as const;

    for (const { variant, as, size } of cases) {
      const { container } = render(
        <Text variant={variant} as={as}>
          {variant}
        </Text>,
      );
      const el = screen.getByText(variant);
      expect(el.className).toContain(size);
      expect(el.className).toContain('font-semibold');
      expect(el.className).toContain('text-foreground');
      // The hero `display` role steps up on desktop so a
      // marketing hero keeps its prominence; every other role is a single
      // locked step.
      if (variant === 'display') expect(el.className).toContain('md:text-5xl');
      cleanup();
      void container;
    }
  });

  it('heading1-4 match the owned typeset h1-h4 tokens byte-for-byte', () => {
    // The Typeset stylesheet renders h1=3xl, h2=2xl, h3=xl,
    // h4=lg (all font 600, foreground color). <Text> heading variants must
    // produce the same size so a <Text as="h2" variant="heading2"> and a
    // prose <h2> are visually identical. This is the whole "one authoring
    // path" contract — if these drift, prose and Text diverge.
    const proseTokens = {
      heading1: 'text-3xl',
      heading2: 'text-2xl',
      heading3: 'text-xl',
      heading4: 'text-lg',
    } as const;
    for (const [variant, token] of Object.entries(proseTokens)) {
      render(
        <Text variant={variant as keyof typeof proseTokens} as="h2">
          prose-{variant}
        </Text>,
      );
      expect(screen.getByText(`prose-${variant}`).className).toContain(token);
      cleanup();
    }
  });

  it('maps body-family variants to their default token + color', () => {
    render(<Text>body-default</Text>);
    const body = screen.getByText('body-default');
    expect(body.tagName).toBe('P');
    expect(body.className).toContain('text-base');
    expect(body.className).toContain('text-foreground');
    expect(body.className).not.toContain('font-semibold');
    cleanup();

    render(<Text variant="secondary">muted</Text>);
    const secondary = screen.getByText('muted');
    expect(secondary.className).toContain('text-base');
    expect(secondary.className).toContain('text-muted-foreground');
    cleanup();

    render(<Text variant="error">boom</Text>);
    const error = screen.getByText('boom');
    expect(error.className).toContain('text-sm');
    expect(error.className).toContain('text-destructive');
  });
});

describe('Text — `as` decouples the element from the variant', () => {
  it('renders the requested element regardless of variant', () => {
    render(
      <Text variant="heading1" as="span">
        span-title
      </Text>,
    );
    expect(screen.getByText('span-title').tagName).toBe('SPAN');
    cleanup();

    // An h2 can carry the heading1 (3xl) visual role.
    render(
      <Text variant="heading1" as="h2">
        h2-visually-h1
      </Text>,
    );
    const el = screen.getByText('h2-visually-h1');
    expect(el.tagName).toBe('H2');
    expect(el.className).toContain('text-3xl');
    cleanup();

    // Body-family defaults to <p> but honours an explicit element.
    render(
      <Text variant="body" as="label" htmlFor="field">
        label-copy
      </Text>,
    );
    const label = screen.getByText('label-copy');
    expect(label.tagName).toBe('LABEL');
    expect(label.getAttribute('for')).toBe('field');
  });
});

describe('Text — size / bold tune body-family only', () => {
  it('applies the size token, overriding the variant default', () => {
    const sizes = [
      { size: 'xs', token: 'text-xs' },
      { size: 'sm', token: 'text-sm' },
      { size: 'base', token: 'text-base' },
      { size: 'lg', token: 'text-lg' },
    ] as const;
    for (const { size, token } of sizes) {
      render(
        <Text variant="body" size={size}>
          sized-{size}
        </Text>,
      );
      const el = screen.getByText(`sized-${size}`);
      expect(el.className).toContain(token);
      // The size wins: the default text-base is not left dangling alongside a
      // different size (cn/tailwind-merge dedupes the font-size group).
      if (token !== 'text-base')
        expect(el.className).not.toContain('text-base');
      cleanup();
    }
  });

  it('bold promotes body copy to semibold', () => {
    render(
      <Text variant="body" bold>
        bold-body
      </Text>,
    );
    expect(screen.getByText('bold-body').className).toContain('font-semibold');
  });
});

describe('Text — truncate + className escape hatch', () => {
  it('truncate adds the single-line clamp utilities', () => {
    render(<Text truncate>clamp-me</Text>);
    const el = screen.getByText('clamp-me');
    expect(el.className).toContain('truncate');
    expect(el.className).toContain('min-w-0');
  });

  it('className merges and a color override wins over the variant default', () => {
    render(
      <Text variant="heading2" as="h2" className="text-destructive mb-6">
        override
      </Text>,
    );
    const el = screen.getByText('override');
    expect(el.className).toContain('mb-6');
    expect(el.className).toContain('text-destructive');
    // cn (tailwind-merge) drops the losing default text color.
    expect(el.className).not.toContain('text-foreground');
    // The locked size is untouched.
    expect(el.className).toContain('text-2xl');
  });

  it('a responsive size added via className survives (base variant token kept)', () => {
    // The documented pattern for a responsive authored heading: pick the
    // base-size variant and layer the md: step via className. Both tokens
    // must survive the merge (different breakpoints = different groups).
    render(
      <Text variant="heading2" as="h1" className="md:text-3xl">
        responsive
      </Text>,
    );
    const el = screen.getByText('responsive');
    expect(el.className).toContain('text-2xl');
    expect(el.className).toContain('md:text-3xl');
  });
});

/**
 * Type-level contract. `pnpm run typecheck` typechecks the test files, so a
 * regression that loosens the API (e.g. dropping the required `as` on a
 * heading, or allowing `size` on one) makes a `@ts-expect-error` below stale
 * and fails typecheck. The function is never executed — it exists purely for
 * the compiler.
 */
function _typeContract() {
  return (
    <>
      {/* @ts-expect-error — a display heading MUST declare its element. */}
      <Text variant="display">no-as</Text>
      {/* @ts-expect-error — heading1 MUST declare its element. */}
      <Text variant="heading1">no-as</Text>
      {/* @ts-expect-error — size is body-only, forbidden on a heading. */}
      <Text variant="heading2" as="h2" size="lg">
        bad-size
      </Text>
      {/* @ts-expect-error — bold is body-only, forbidden on a heading. */}
      <Text variant="heading3" as="h3" bold>
        bad-bold
      </Text>
      {/* Valid: heading with `as`. */}
      <Text variant="heading4" as="h4">
        ok
      </Text>
      {/* Valid: body-family needs no `as` and accepts size + bold. */}
      <Text>ok</Text>
      <Text variant="secondary" size="sm" bold>
        ok
      </Text>
      <Text variant="error" as="span">
        ok
      </Text>
    </>
  );
}
void _typeContract;
