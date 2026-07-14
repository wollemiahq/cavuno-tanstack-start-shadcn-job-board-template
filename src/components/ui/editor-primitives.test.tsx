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

describe('owned Rhea editor primitives', () => {
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
    render(
      <Popover open>
        <PopoverTrigger>Link</PopoverTrigger>
        <PopoverContent>Link settings</PopoverContent>
      </Popover>,
    );

    const content = screen.getByText('Link settings');
    expect(content).toHaveAttribute('data-slot', 'popover-content');
    expect(content.closest('.rhea-theme')).toBeNull();
  });

  it('renders portaled tooltip content under the global theme', () => {
    render(
      <TooltipProvider>
        <Tooltip open>
          <TooltipTrigger>Format</TooltipTrigger>
          <TooltipContent>Bold</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );

    const content = screen.getByText('Bold');
    expect(content).toHaveAttribute('data-slot', 'tooltip-content');
    expect(content.closest('.rhea-theme')).toBeNull();
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
