// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './card';

afterEach(cleanup);

describe('owned shadcn Card', () => {
  it('owns the complete public API and small spacing variant', () => {
    const { container } = render(
      <Card size="sm">
        <CardHeader>
          <CardTitle>Starter title</CardTitle>
          <CardDescription>Starter description</CardDescription>
          <CardAction>Action</CardAction>
        </CardHeader>
        <CardContent>Content</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>,
    );

    expect(container.querySelector('[data-slot="card"]')).toHaveAttribute(
      'data-size',
      'sm',
    );
    for (const slot of [
      'card-header',
      'card-title',
      'card-description',
      'card-action',
      'card-content',
      'card-footer',
    ]) {
      expect(container.querySelector(`[data-slot="${slot}"]`)).not.toBeNull();
    }
    expect(screen.getByText('Starter title')).toBeInTheDocument();
  });

  it('drives the spacing variant through the data-size attribute', () => {
    // The `--card-spacing` token is switched by the CSS `data-[size=sm]:`
    // selector, so the observable behavioral seam is that the `size` prop
    // maps to `data-size` — default vs sm — which the styling keys off.
    const { container: def } = render(<Card>Default</Card>);
    expect(def.querySelector('[data-slot="card"]')).toHaveAttribute(
      'data-size',
      'default',
    );

    const { container: sm } = render(<Card size="sm">Small</Card>);
    expect(sm.querySelector('[data-slot="card"]')).toHaveAttribute(
      'data-size',
      'sm',
    );
  });
});
