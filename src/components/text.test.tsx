// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { Text } from './text';
afterEach(cleanup);
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
