// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Separator } from './separator';
import { Toggle } from './toggle';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './tooltip';

afterEach(cleanup);

describe('owned shadcn editor primitives', () => {
  it('exposes a pressed button contract for formatting controls', () => {
    const onPressedChange = vi.fn();

    render(
      <Toggle pressed onPressedChange={onPressedChange} aria-label="Bold">
        B
      </Toggle>,
    );

    const toggle = screen.getByRole('button', { name: 'Bold' });
    expect(toggle).toHaveAttribute('data-slot', 'toggle');
    expect(toggle).toHaveAttribute('aria-pressed', 'true');

    toggle.click();
    expect(onPressedChange).toHaveBeenCalledWith(false, expect.anything());
  });

  it('renders portaled popover content under the global theme', () => {
    const { container } = render(
      <Popover open>
        <PopoverTrigger>Link</PopoverTrigger>
        <PopoverContent>Link settings</PopoverContent>
      </Popover>,
    );

    const content = screen.getByText('Link settings');
    expect(content).toHaveAttribute('data-slot', 'popover-content');
    // Real portaling check: content mounts to the document body, outside the
    // component subtree, so the app's <body> theme (not a local scope) applies.
    expect(container).not.toContainElement(content);
    expect(document.body).toContainElement(content);
  });

  it('renders portaled tooltip content under the global theme', () => {
    const { container } = render(
      <TooltipProvider>
        <Tooltip open>
          <TooltipTrigger>Format</TooltipTrigger>
          <TooltipContent>Bold</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );

    const content = screen.getByText('Bold');
    expect(content).toHaveAttribute('data-slot', 'tooltip-content');
    // Real portaling check: content mounts to the document body, outside the
    // component subtree, so the app's <body> theme (not a local scope) applies.
    expect(container).not.toContainElement(content);
    expect(document.body).toContainElement(content);
  });

  it('renders semantic horizontal and vertical separators', () => {
    const { rerender } = render(<Separator />);
    expect(screen.getByRole('separator')).toHaveAttribute(
      'aria-orientation',
      'horizontal',
    );

    rerender(<Separator orientation="vertical" />);
    expect(screen.getByRole('separator')).toHaveAttribute(
      'aria-orientation',
      'vertical',
    );
  });
});
