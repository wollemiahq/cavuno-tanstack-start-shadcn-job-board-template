// @vitest-environment jsdom
/**
 * The carousel's scroll axis follows the document direction described in
 * docs/theming.md §"Direction that lives in JS".
 *
 * Embla translates its track in raw pixels, so `<html dir="rtl">` mirrors the
 * arrow buttons — they use logical insets and `rtl:` variants — without
 * mirroring the scroll. That half-mirrored state is worse than none: the
 * arrows point one way and the content moves the other. `direction: 'rtl'` is
 * embla's own flip, and it is the one thing these pin.
 *
 * Two subtleties the tests exist to protect:
 *   • prev/next do NOT swap. Embla reverses the track, not its notion of
 *     order, so the previous slide is still the one toward the start — the
 *     physical right under RTL, where `-start-12` and `rtl:rotate-180`
 *     already put the "previous" button and point its chevron. Anyone
 *     "fixing" the double flip breaks it.
 *   • arrow KEYS are physical, so they swap for a horizontal RTL carousel:
 *     ArrowLeft advances. A vertical axis is not mirrored.
 *
 * Nothing in the app renders `Carousel` today — it ships as part of the
 * design system for adopters to compose with, which is exactly why its
 * behaviour is pinned here rather than through a live surface. Embla is
 * stubbed: jsdom has no layout, so a real instance would never scroll.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  Carousel,
  CarouselRoot,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  resolveCarouselOptions,
} from '@/components/ui/carousel';
import { DirectionProvider } from '@/components/ui/direction';

type CarouselOptions = NonNullable<
  React.ComponentProps<typeof Carousel>['opts']
>;

interface CarouselHarness {
  options: CarouselOptions[];
  scrollNext: ReturnType<typeof vi.fn<() => void>>;
  scrollPrev: ReturnType<typeof vi.fn<() => void>>;
}

const embla: CarouselHarness = {
  options: [],
  scrollNext: vi.fn<() => void>(),
  scrollPrev: vi.fn<() => void>(),
};

/** The last options object embla was constructed with. */
function lastOptions() {
  return embla.options.at(-1);
}

function renderCarousel(
  direction: 'ltr' | 'rtl',
  props: React.ComponentProps<typeof Carousel> = {},
) {
  const orientation = props.orientation ?? 'horizontal';
  const resolved = resolveCarouselOptions({
    orientation,
    opts: props.opts,
    dir: props.dir,
    contextDirection: direction,
  });
  embla.options.push(resolved.options);
  return render(
    <DirectionProvider direction={direction}>
      <CarouselRoot
        {...props}
        orientation={orientation}
        opts={resolved.options}
        dir={resolved.direction}
        carouselRef={() => undefined}
        api={undefined}
        controller={{
          scrollNext: embla.scrollNext,
          scrollPrev: embla.scrollPrev,
          canScrollNext: () => true,
          canScrollPrev: () => true,
          on: () => undefined,
          off: () => undefined,
        }}
      >
        <CarouselContent>
          <CarouselItem>one</CarouselItem>
          <CarouselItem>two</CarouselItem>
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </CarouselRoot>
    </DirectionProvider>,
  );
}

beforeEach(() => {
  embla.options.length = 0;
  embla.scrollNext.mockClear();
  embla.scrollPrev.mockClear();
});
afterEach(cleanup);

describe('Carousel scroll direction', () => {
  it('scrolls left-to-right under LTR', () => {
    renderCarousel('ltr');
    expect(lastOptions()?.direction).toBe('ltr');
  });

  it('flips embla’s axis under RTL', () => {
    renderCarousel('rtl');
    expect(lastOptions()?.direction).toBe('rtl');
    expect(screen.getByRole('region').getAttribute('dir')).toBe('rtl');
  });

  it('still keys the axis off orientation', () => {
    renderCarousel('rtl', { orientation: 'vertical' });
    expect(lastOptions()?.axis).toBe('y');
    expect(lastOptions()?.direction).toBe('rtl');
  });

  it('lets an explicit opts.direction win over the document', () => {
    renderCarousel('rtl', { opts: { direction: 'ltr' } });
    expect(lastOptions()?.direction).toBe('ltr');
    expect(screen.getByRole('region').getAttribute('dir')).toBe('ltr');
  });

  it('keeps a dir prop in sync with embla when no option overrides it', () => {
    renderCarousel('rtl', { dir: 'ltr' });
    expect(lastOptions()?.direction).toBe('ltr');
    expect(screen.getByRole('region').getAttribute('dir')).toBe('ltr');
  });
});

describe('Carousel prev/next semantics', () => {
  it('keeps the buttons tied to slide order in both directions', () => {
    for (const direction of ['ltr', 'rtl'] as const) {
      renderCarousel(direction);
      fireEvent.click(screen.getAllByRole('button')[0]);
      expect(embla.scrollPrev).toHaveBeenCalled();
      fireEvent.click(screen.getAllByRole('button')[1]);
      expect(embla.scrollNext).toHaveBeenCalled();
      cleanup();
      embla.scrollPrev.mockClear();
      embla.scrollNext.mockClear();
    }
  });

  it('maps the physical arrow keys through the direction', () => {
    renderCarousel('ltr');
    fireEvent.keyDown(screen.getByRole('region'), { key: 'ArrowLeft' });
    expect(embla.scrollPrev).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(screen.getByRole('region'), { key: 'ArrowRight' });
    expect(embla.scrollNext).toHaveBeenCalledTimes(1);

    cleanup();
    embla.scrollPrev.mockClear();
    embla.scrollNext.mockClear();

    renderCarousel('rtl');
    // Left is toward the END of an RTL track, so it advances.
    fireEvent.keyDown(screen.getByRole('region'), { key: 'ArrowLeft' });
    expect(embla.scrollNext).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(screen.getByRole('region'), { key: 'ArrowRight' });
    expect(embla.scrollPrev).toHaveBeenCalledTimes(1);
  });

  it('does not swap horizontal keys for a vertical RTL carousel', () => {
    renderCarousel('rtl', { orientation: 'vertical' });
    fireEvent.keyDown(screen.getByRole('region'), { key: 'ArrowLeft' });
    expect(embla.scrollPrev).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(screen.getByRole('region'), { key: 'ArrowRight' });
    expect(embla.scrollNext).toHaveBeenCalledTimes(1);
  });
});
